import { pool } from '../db.js';

// Constants
export const HASHES_PER_DAY_PER_100K = 2500;
export const TON_PER_HASH = 0.020 / 2500; // = 0.000008 (маржа ~35%)
export const MIN_WITHDRAW = 0.05; // TON
export const BONUS_DECAY_RATE = 0.85; // 15% decay per day

export const getHashesPerMinute = (power) => {
  return (power / 100000) * (HASHES_PER_DAY_PER_100K / 1440);
};

export const accrueHashes = async () => {
  try {
    // Accrue hashes based on (power + bonus_power)
    // power = permanent (purchased), bonus_power = temporary (ads/refs/tasks)
    await pool.query(`
      UPDATE users SET
        hashes = hashes + ((power + COALESCE(bonus_power, 0)) / 100000.0) * ($1::numeric / 1440.0) *
          LEAST(GREATEST(1, EXTRACT(EPOCH FROM (NOW() - last_accrue_at)) / 60.0), 120),
        last_accrue_at = NOW()
      WHERE (power + COALESCE(bonus_power, 0)) > 0
        AND last_accrue_at < NOW() - INTERVAL '55 seconds'
    `, [HASHES_PER_DAY_PER_100K]);
  } catch (e) {
    console.error('accrueHashes error:', e.message);
  }
};

// Decay bonus_power by 15% daily — called once per day by cron
export const decayBonusPower = async () => {
  try {
    const { rowCount } = await pool.query(`
      UPDATE users SET bonus_power = FLOOR(bonus_power * $1)
      WHERE bonus_power > 1
    `, [BONUS_DECAY_RATE]);
    // Zero out tiny remainders
    await pool.query(`UPDATE users SET bonus_power = 0 WHERE bonus_power > 0 AND bonus_power <= 1`);
    console.log(`[Cron] Bonus power decayed (${BONUS_DECAY_RATE}x) for ${rowCount} users`);
  } catch (e) {
    console.error('decayBonusPower error:', e.message);
  }
};
