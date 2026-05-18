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

// Convert expired purchased power to bonus_power — called once per day by cron
// After payback_at date, the purchased power moves to bonus_power (which decays 15%/day)
export const convertExpiredPower = async () => {
  try {
    // Find purchases where payback period has passed and not yet converted
    const { rows } = await pool.query(`
      SELECT p.id, p.user_id, p.power_amount
      FROM purchases p
      WHERE p.payback_at IS NOT NULL
        AND p.payback_at <= NOW()
        AND (p.power_converted IS NULL OR p.power_converted = FALSE)
    `);

    if (!rows.length) {
      console.log('[Cron] No expired power purchases to convert');
      return;
    }

    for (const purchase of rows) {
      const amt = parseFloat(purchase.power_amount);
      if (amt <= 0) continue;

      // Move power → bonus_power (atomic: subtract from power, add to bonus_power)
      await pool.query(`
        UPDATE users SET
          power = GREATEST(0, power - $1),
          bonus_power = COALESCE(bonus_power, 0) + $1
        WHERE id = $2
      `, [amt, purchase.user_id]);

      // Mark as converted
      await pool.query(`
        UPDATE purchases SET power_converted = TRUE WHERE id = $1
      `, [purchase.id]);
    }

    console.log(`[Cron] Converted ${rows.length} expired purchases to bonus_power`);
  } catch (e) {
    console.error('convertExpiredPower error:', e.message);
  }
};
