import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pool } from '../db.js';
import { TON_PER_HASH, getHashesPerMinute } from '../services/mining.js';

const router = Router();

// All settings keys needed by frontend
const SETTINGS_KEYS = [
  'min_withdraw_ton', 'withdraw_fee_mode', 'withdraw_fee_fixed',
  'withdraw_fee_percent', 'withdraw_fee_hybrid_threshold',
  'withdraw_processing_hours'
];

router.post('/init', authMiddleware, async (req, res) => {
  const user = req.user;
  const power = parseFloat(user.power || 0);
  const hashesPerDay = getHashesPerMinute(power) * 1440;
  const tonPerDay = hashesPerDay * TON_PER_HASH;

  // Load dynamic settings for frontend
  let settings = {
    min_withdraw_ton: 0.1,
    withdraw_fee_mode: 'none',
    withdraw_fee_fixed: 0.01,
    withdraw_fee_percent: 5,
    withdraw_fee_hybrid_threshold: 1,
    withdraw_processing_hours: '1-24',
  };
  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM app_settings WHERE key = ANY($1)`, [SETTINGS_KEYS]
    );
    rows.forEach(r => {
      if (r.key === 'withdraw_fee_mode' || r.key === 'withdraw_processing_hours') {
        settings[r.key] = r.value;
      } else {
        settings[r.key] = parseFloat(r.value);
      }
    });
  // Check if current user is admin
  let isAdmin = false;
  let adminPerms = null;
  const tgId = String(user.tg_id);

  // Check env-based super admins
  const envAdminIds = (process.env.ADMIN_TG_IDS || process.env.ADMIN_TG_ID || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (envAdminIds.includes(tgId)) {
    isAdmin = true;
    adminPerms = '*';
  }

  // Check DB-based admins
  if (!isAdmin) {
    try {
      const { rows: adminRows } = await pool.query(
        `SELECT permissions FROM admins WHERE tg_id = $1`, [tgId]
      );
      if (adminRows.length) {
        isAdmin = true;
        try { adminPerms = JSON.parse(adminRows[0].permissions || '[]'); } catch (e) { adminPerms = []; }
      }
    } catch (e) {}
  }

  res.json({
    user,
    mining: {
      power,
      hashes: parseFloat(user.hashes || 0),
      ton_balance: parseFloat(user.ton_balance || 0),
      hashes_per_day: hashesPerDay,
      ton_per_day: tonPerDay,
      ton_per_month: tonPerDay * 30,
      ton_per_3months: tonPerDay * 90,
      ton_per_hash: TON_PER_HASH
    },
    settings,
    isAdmin,
    adminPerms
  });
});

export default router;
