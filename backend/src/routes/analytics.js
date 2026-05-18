import { Router } from 'express';
import { pool } from '../db.js';
import { HASHES_PER_DAY_PER_100K, TON_PER_HASH, BONUS_DECAY_RATE } from '../services/mining.js';

const router = Router();

// Auth by key: x-analytics-key header must match ADMIN_KEY
const analyticsAuth = (req, res, next) => {
  const key = req.headers['x-analytics-key'] || req.query.key;
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid analytics key' });
  }
  next();
};

router.use(analyticsAuth);

// ─────────────── OVERVIEW ───────────────
router.get('/overview', async (req, res) => {
  try {
    const [users, purchases, withdrawals, tasks, settings] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_premium) as premium_users,
          COUNT(*) FILTER (WHERE is_blocked) as blocked_users,
          COUNT(*) FILTER (WHERE bot_blocked) as bot_blocked,
          COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '24 hours') as active_24h,
          COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '7 days') as active_7d,
          COUNT(*) FILTER (WHERE power > 0 OR bonus_power > 0) as miners,
          SUM(power) as total_power,
          SUM(bonus_power) as total_bonus_power,
          SUM(hashes) as total_hashes,
          SUM(ton_balance) as total_ton_balance,
          SUM(ads_watched) as total_ads_watched
        FROM users
      `),
      pool.query(`
        SELECT
          COUNT(*) as total_purchases,
          SUM(ton_paid) as total_revenue,
          SUM(power_amount) as total_power_sold,
          COUNT(DISTINCT user_id) as unique_buyers
        FROM purchases
      `),
      pool.query(`
        SELECT
          COUNT(*) as total_withdrawals,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          SUM(ton_amount) FILTER (WHERE status = 'completed') as total_withdrawn,
          SUM(fee_amount) FILTER (WHERE status = 'completed') as total_fees
        FROM withdrawals
      `),
      pool.query(`
        SELECT
          COUNT(*) as total_task_completions
        FROM user_tasks
      `),
      pool.query(`SELECT key, value FROM app_settings`)
    ]);

    const cfg = {};
    settings.rows.forEach(r => cfg[r.key] = r.value);

    res.json({
      timestamp: new Date().toISOString(),
      constants: {
        hashes_per_day_per_100k: HASHES_PER_DAY_PER_100K,
        ton_per_hash: TON_PER_HASH,
        ton_per_day_per_100k: HASHES_PER_DAY_PER_100K * TON_PER_HASH,
        bonus_decay_rate: BONUS_DECAY_RATE,
      },
      settings: cfg,
      users: users.rows[0],
      purchases: purchases.rows[0],
      withdrawals: withdrawals.rows[0],
      tasks: tasks.rows[0],
      profit: {
        total_revenue: parseFloat(purchases.rows[0].total_revenue || 0),
        total_withdrawn: parseFloat(withdrawals.rows[0].total_withdrawn || 0),
        total_fees: parseFloat(withdrawals.rows[0].total_fees || 0),
        net_profit: parseFloat(purchases.rows[0].total_revenue || 0) - parseFloat(withdrawals.rows[0].total_withdrawn || 0),
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── ECONOMY ───────────────
router.get('/economy', async (req, res) => {
  try {
    const tonPerDay100K = HASHES_PER_DAY_PER_100K * TON_PER_HASH;

    // Packages
    const { rows: packages } = await pool.query(
      `SELECT *, COALESCE(duration_days, 21) as duration FROM power_packages WHERE is_active = TRUE ORDER BY power_amount`
    );

    // Calculate margins per package
    const packageAnalysis = packages.map(pkg => {
      const p = parseFloat(pkg.power_amount);
      const price = parseFloat(pkg.price_ton);
      const days = pkg.duration || 21;
      const dailyTon = (p / 100000) * tonPerDay100K;
      const phase1 = dailyTon * days;
      const bonusTail = dailyTon * (1 / (1 - BONUS_DECAY_RATE));
      const totalPayout = phase1 + bonusTail;
      const marginNoRef = ((price - totalPayout) / price * 100);
      const revenueWithRef = price * 0.9;
      const marginWithRef = ((revenueWithRef - totalPayout) / price * 100);

      return {
        name: pkg.name,
        power: p,
        price,
        duration_days: days,
        ton_per_day: +dailyTon.toFixed(6),
        phase1_payout: +phase1.toFixed(4),
        bonus_tail: +bonusTail.toFixed(4),
        total_payout: +totalPayout.toFixed(4),
        margin_no_ref: +marginNoRef.toFixed(1),
        margin_with_ref_10pct: +marginWithRef.toFixed(1),
        profitable: totalPayout < price,
      };
    });

    // Current total liabilities (power mining + pending withdrawals)
    const { rows: [liabilities] } = await pool.query(`
      SELECT
        SUM(power) as total_power,
        SUM(bonus_power) as total_bonus,
        SUM(ton_balance) as pending_ton
      FROM users WHERE power > 0 OR bonus_power > 0 OR ton_balance > 0
    `);

    const totalPower = parseFloat(liabilities.total_power || 0);
    const totalBonus = parseFloat(liabilities.total_bonus || 0);
    const dailyMiningCost = ((totalPower + totalBonus) / 100000) * tonPerDay100K;

    res.json({
      packages: packageAnalysis,
      liabilities: {
        total_power: totalPower,
        total_bonus_power: totalBonus,
        pending_ton_balances: parseFloat(liabilities.pending_ton || 0),
        daily_mining_cost_ton: +dailyMiningCost.toFixed(6),
        monthly_mining_cost_ton: +(dailyMiningCost * 30).toFixed(4),
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── USERS ───────────────
router.get('/users', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || 'power'; // power, hashes, ton_balance, created_at
    const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
    const allowed = ['power', 'hashes', 'ton_balance', 'created_at', 'bonus_power', 'ads_watched'];
    const orderBy = allowed.includes(sort) ? sort : 'power';

    const { rows } = await pool.query(`
      SELECT u.id, u.tg_id, u.username, u.first_name, u.power, u.bonus_power,
             u.hashes, u.ton_balance, u.is_premium, u.is_blocked, u.bot_blocked,
             u.ads_watched, u.last_seen_at, u.created_at,
             (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.id) as ref_count,
             (SELECT COUNT(*) FROM purchases WHERE user_id = u.id) as purchase_count,
             (SELECT COALESCE(SUM(ton_paid), 0) FROM purchases WHERE user_id = u.id) as total_spent
      FROM users u
      ORDER BY ${orderBy} ${dir}
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) FROM users`);

    res.json({ total: parseInt(count), limit, offset, users: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── USER DETAIL ───────────────
router.get('/users/:id', async (req, res) => {
  try {
    const { rows: [user] } = await pool.query(`
      SELECT * FROM users WHERE id = $1 OR tg_id = $1::TEXT::BIGINT
    `, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [purchases, withdrawals, refs, tasks] = await Promise.all([
      pool.query(`SELECT * FROM purchases WHERE user_id = $1 ORDER BY created_at DESC`, [user.id]),
      pool.query(`SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC`, [user.id]),
      pool.query(`
        SELECT r.*, u.username, u.first_name, u.power FROM referrals r
        JOIN users u ON u.id = r.referee_id WHERE r.referrer_id = $1
      `, [user.id]),
      pool.query(`SELECT ut.*, t.title FROM user_tasks ut JOIN tasks t ON t.id = ut.task_id WHERE ut.user_id = $1`, [user.id]),
    ]);

    const tonPerDay = ((parseFloat(user.power) + parseFloat(user.bonus_power || 0)) / 100000) * HASHES_PER_DAY_PER_100K * TON_PER_HASH;

    res.json({
      user,
      mining: {
        ton_per_day: +tonPerDay.toFixed(6),
        ton_per_month: +(tonPerDay * 30).toFixed(4),
        total_spent: purchases.rows.reduce((s, p) => s + parseFloat(p.ton_paid), 0),
        total_withdrawn: withdrawals.rows.filter(w => w.status === 'completed').reduce((s, w) => s + parseFloat(w.ton_amount), 0),
      },
      purchases: purchases.rows,
      withdrawals: withdrawals.rows,
      referrals: refs.rows,
      tasks_completed: tasks.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── PACKAGE SALES ───────────────
router.get('/packages', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        pkg.name, pkg.power_amount, pkg.price_ton,
        COUNT(p.id) as sales_count,
        COALESCE(SUM(p.ton_paid), 0) as total_revenue,
        COUNT(DISTINCT p.user_id) as unique_buyers,
        COUNT(p.id) FILTER (WHERE p.power_converted = TRUE) as converted_count
      FROM power_packages pkg
      LEFT JOIN purchases p ON p.package_id = pkg.id
      GROUP BY pkg.id, pkg.name, pkg.power_amount, pkg.price_ton
      ORDER BY pkg.power_amount
    `);
    res.json({ packages: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── REFERRAL STATS ───────────────
router.get('/referrals', async (req, res) => {
  try {
    const { rows: top } = await pool.query(`
      SELECT u.id, u.tg_id, u.username, u.first_name,
             COUNT(r.id) as ref_count,
             COUNT(r.id) FILTER (WHERE r.is_confirmed) as confirmed,
             COALESCE(SUM(rr.ton_amount), 0) as total_earned_ton,
             COALESCE(SUM(rr.power_amount), 0) as total_earned_power
      FROM users u
      JOIN referrals r ON r.referrer_id = u.id
      LEFT JOIN referral_rewards rr ON rr.referrer_id = u.id
      GROUP BY u.id
      ORDER BY ref_count DESC
      LIMIT 50
    `);

    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE is_confirmed) as confirmed,
        COUNT(DISTINCT referrer_id) as unique_referrers
      FROM referrals
    `);

    res.json({ stats: stats, top_referrers: top });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── DAILY REPORT ───────────────
router.get('/daily', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);

    const { rows } = await pool.query(`
      SELECT
        d::date as date,
        (SELECT COUNT(*) FROM users WHERE created_at::date = d::date) as new_users,
        (SELECT COUNT(*) FROM purchases WHERE created_at::date = d::date) as purchases,
        (SELECT COALESCE(SUM(ton_paid), 0) FROM purchases WHERE created_at::date = d::date) as revenue,
        (SELECT COUNT(*) FROM withdrawals WHERE created_at::date = d::date AND status = 'completed') as withdrawals,
        (SELECT COALESCE(SUM(ton_amount), 0) FROM withdrawals WHERE created_at::date = d::date AND status = 'completed') as withdrawn
      FROM generate_series(NOW() - ($1 || ' days')::INTERVAL, NOW(), '1 day') d
      ORDER BY d DESC
    `, [days]);

    res.json({ days: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── HEALTH / RISKS ───────────────
router.get('/risks', async (req, res) => {
  try {
    const tonPerDay100K = HASHES_PER_DAY_PER_100K * TON_PER_HASH;

    // Users earning more than they paid
    const { rows: unprofitable } = await pool.query(`
      SELECT u.id, u.tg_id, u.username, u.power, u.bonus_power, u.ton_balance,
             COALESCE((SELECT SUM(ton_paid) FROM purchases WHERE user_id = u.id), 0) as total_paid,
             COALESCE((SELECT SUM(ton_amount) FROM withdrawals WHERE user_id = u.id AND status = 'completed'), 0) as total_withdrawn
      FROM users u
      WHERE u.ton_balance > 0.01
      ORDER BY u.ton_balance DESC
      LIMIT 20
    `);

    // Pending payouts
    const { rows: [pending] } = await pool.query(`
      SELECT SUM(ton_balance) as total_pending FROM users WHERE ton_balance > 0
    `);

    // Expiring purchases (converting soon)
    const { rows: expiring } = await pool.query(`
      SELECT p.*, u.username, u.tg_id FROM purchases p
      JOIN users u ON u.id = p.user_id
      WHERE p.payback_at IS NOT NULL
        AND p.payback_at <= NOW() + INTERVAL '3 days'
        AND (p.power_converted IS NULL OR p.power_converted = FALSE)
      ORDER BY p.payback_at
      LIMIT 20
    `);

    // Total platform power & daily cost
    const { rows: [totals] } = await pool.query(`
      SELECT SUM(power) as power, SUM(bonus_power) as bonus FROM users
    `);
    const totalPower = parseFloat(totals.power || 0) + parseFloat(totals.bonus || 0);
    const dailyCost = (totalPower / 100000) * tonPerDay100K;

    res.json({
      pending_payouts: parseFloat(pending.total_pending || 0),
      daily_mining_cost: +dailyCost.toFixed(4),
      monthly_mining_cost: +(dailyCost * 30).toFixed(4),
      expiring_purchases: expiring,
      top_balances: unprofitable,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════
//  WRITE ENDPOINTS (Management)
// ═══════════════════════════════════════════

// ─────────────── UPDATE SETTINGS ───────────────
// POST /api/analytics/settings { key: "ref_commission_pct", value: "10" }
router.post('/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' });

    const { rowCount } = await pool.query(
      `UPDATE app_settings SET value = $1 WHERE key = $2`, [String(value), key]
    );
    if (!rowCount) {
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ($1, $2)`, [key, String(value)]
      );
    }
    res.json({ success: true, key, value: String(value) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk update settings: POST /api/analytics/settings/bulk { settings: { key1: val1, key2: val2 } }
router.post('/settings/bulk', async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'settings object required' });

    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      const { rowCount } = await pool.query(
        `UPDATE app_settings SET value = $1 WHERE key = $2`, [String(value), key]
      );
      if (!rowCount) {
        await pool.query(`INSERT INTO app_settings (key, value) VALUES ($1, $2)`, [key, String(value)]);
      }
      results.push({ key, value: String(value) });
    }
    res.json({ success: true, updated: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── EDIT USER ───────────────
// POST /api/analytics/users/:id/edit { power: 5000, bonus_power: 0, ton_balance: 0, is_blocked: true }
router.post('/users/:id/edit', async (req, res) => {
  try {
    const { rows: [user] } = await pool.query(
      `SELECT id FROM users WHERE id = $1 OR tg_id = $1::TEXT::BIGINT`, [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const allowed = ['power', 'bonus_power', 'ton_balance', 'hashes', 'is_blocked', 'is_premium'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    values.push(user.id);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values
    );

    const { rows: [updated] } = await pool.query(`SELECT * FROM users WHERE id = $1`, [user.id]);
    res.json({ success: true, user: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── EDIT PACKAGE ───────────────
// POST /api/analytics/packages/:name/edit { price_ton: 8.00, duration_days: 21, is_active: true }
router.post('/packages/:name/edit', async (req, res) => {
  try {
    const allowed = ['price_ton', 'power_amount', 'duration_days', 'is_active', 'description', 'badge', 'sale_price', 'is_popular'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (!updates.length) return res.status(400).json({ error: 'No valid fields' });

    values.push(req.params.name);
    const { rowCount } = await pool.query(
      `UPDATE power_packages SET ${updates.join(', ')} WHERE LOWER(name) = LOWER($${idx})`, values
    );

    if (!rowCount) return res.status(404).json({ error: 'Package not found' });

    const { rows: [pkg] } = await pool.query(
      `SELECT * FROM power_packages WHERE LOWER(name) = LOWER($1)`, [req.params.name]
    );
    res.json({ success: true, package: pkg });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── RAW SQL (read-only) ───────────────
// POST /api/analytics/query { sql: "SELECT ..." }
router.post('/query', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: 'sql required' });

    // Block dangerous operations
    const upper = sql.toUpperCase().trim();
    const blocked = ['DROP', 'TRUNCATE', 'DELETE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
    for (const kw of blocked) {
      if (upper.startsWith(kw)) {
        return res.status(403).json({ error: `${kw} operations not allowed. Use UPDATE/INSERT only for data changes.` });
      }
    }

    const { rows, rowCount } = await pool.query(sql);
    res.json({ rows, rowCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────── APPROVE/REJECT WITHDRAWAL ───────────────
// POST /api/analytics/withdrawals/:id/status { status: "completed" | "rejected" }
router.post('/withdrawals/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['completed', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { rowCount } = await pool.query(
      `UPDATE withdrawals SET status = $1 WHERE id = $2`, [status, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Withdrawal not found' });

    // If rejecting — refund ton_balance
    if (status === 'rejected') {
      const { rows: [w] } = await pool.query(`SELECT user_id, ton_amount FROM withdrawals WHERE id = $1`, [req.params.id]);
      if (w) {
        await pool.query(`UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2`, [w.ton_amount, w.user_id]);
      }
    }

    res.json({ success: true, id: req.params.id, status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

