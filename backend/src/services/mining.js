import { pool } from '../db.js';

// Constants
export const HASHES_PER_DAY_PER_100K = 2500;
export const TON_PER_HASH = 0.036 / 2500; // 0.0000144
export const MIN_WITHDRAW = 0.1; // TON

export const getHashesPerMinute = (power) => {
  return (power / 100000) * (HASHES_PER_DAY_PER_100K / 1440);
};

export const accrueHashes = async () => {
  try {
    // Single batch UPDATE — accrue hashes for all users with power > 0
    // who haven't been updated in the last 55 seconds
    // Drift capped at 120 minutes to prevent huge compensation after long outages
    await pool.query(`
      UPDATE users SET
        hashes = hashes + (power / 100000.0) * ($1::numeric / 1440.0) *
          LEAST(GREATEST(1, EXTRACT(EPOCH FROM (NOW() - last_accrue_at)) / 60.0), 120),
        last_accrue_at = NOW()
      WHERE power > 0
        AND last_accrue_at < NOW() - INTERVAL '55 seconds'
    `, [HASHES_PER_DAY_PER_100K]);
  } catch (e) {
    console.error('accrueHashes error:', e.message);
  }
};
