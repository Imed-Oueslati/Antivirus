const router = require('express').Router();
const auth   = require('../middleware/auth');
const { sequelize } = require('../models');

// GET /api/users/stats/me
router.get('/stats/me', auth, async (req, res) => {
  try {
    const [row] = await sequelize.query(
      `SELECT
        u.id, u.username, u.email,
        COUNT(DISTINCT ss.id)                       AS total_sessions,
        COALESCE(SUM(ss.duration_sec), 0)           AS total_scan_seconds,
        FLOOR(COALESCE(SUM(ss.duration_sec),0)/86400)              AS days,
        FLOOR((COALESCE(SUM(ss.duration_sec),0) % 86400) / 60)     AS minutes,
        COALESCE(SUM(ss.duration_sec),0) % 60                      AS seconds,
        COUNT(DISTINCT t.id)                        AS total_threats_found
      FROM users u
      LEFT JOIN scan_sessions ss ON ss.user_id = u.id
      LEFT JOIN threats t        ON t.user_id  = u.id
      WHERE u.id = ?
      GROUP BY u.id, u.username, u.email`,
      { replacements: [req.user.id], type: sequelize.QueryTypes.SELECT }
    );
    res.json(row || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/stats  (all users — admin view)
router.get('/stats', auth, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT
        u.id, u.username, u.email, u.role,
        COUNT(DISTINCT ss.id)                       AS total_sessions,
        COALESCE(SUM(ss.duration_sec), 0)           AS total_scan_seconds,
        FLOOR(COALESCE(SUM(ss.duration_sec),0)/86400)              AS days,
        FLOOR((COALESCE(SUM(ss.duration_sec),0) % 86400) / 60)     AS minutes,
        COALESCE(SUM(ss.duration_sec),0) % 60                      AS seconds,
        COUNT(DISTINCT t.id)                        AS total_threats_found,
        MAX(ss.started_at)                          AS last_active
      FROM users u
      LEFT JOIN scan_sessions ss ON ss.user_id = u.id
      LEFT JOIN threats t        ON t.user_id  = u.id
      GROUP BY u.id, u.username, u.email, u.role
      ORDER BY total_scan_seconds DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;