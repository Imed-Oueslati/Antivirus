const router  = require('express').Router();
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
const auth    = require('../middleware/auth');
const { ScanSession, Threat, User } = require('../models');

// POST /api/scan/file
router.post('/file', auth, async (req, res) => {
  try {
    const { features, filename, filepath, session_id } = req.body;

    const { data } = await axios.post(
      `${process.env.AI_SERVICE_URL}/scan`,
      { features, filename, source: 'disk' }
    );

    let blocked = false;

    if (data.is_malicious) {
      // ── Try to block (delete/quarantine) the file ──
      if (filepath) {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);   // delete the file
            blocked = true;
          }
        } catch (e) {
          console.error('Could not delete file:', e.message);
        }
      }

      const threat = await Threat.create({
        user_id:     req.user.id,
        session_id:  session_id || null,
        filename,
        filepath,                      // full path stored in DB
        threat_name: data.threat_type,
        threat_type: data.threat_type,
        severity:    data.threat_score > 0.85 ? 'critical' : 'high',
        ai_score:    data.threat_score,
        action_taken: blocked ? 'deleted' : 'pending',
        is_blocked:  blocked,
        source:      'disk',
      });

      req.app.get('io').emit('threat_detected', {
        userId:    req.user.id,
        filename,
        filepath,
        blocked,
        threat_id: threat.id,
        ...data
      });
    }

    res.json({ ...data, blocked, filepath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/scan/usb  — scan all files on a USB drive
router.post('/usb', auth, async (req, res) => {
  try {
    const { drive } = req.body;   // e.g. "E:\\"
    const results   = [];

    const session = await ScanSession.create({
      user_id:   req.user.id,
      scan_type: 'usb',
    });

    // Recursively get all files on the drive
    function getFiles(dir) {
      let files = [];
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            files = files.concat(getFiles(full));
          } else {
            files.push(full);
          }
        }
      } catch {}
      return files;
    }

    const files = getFiles(drive).slice(0, 500); // limit 500 files

    for (const filepath of files) {
      try {
        const filename = path.basename(filepath);
        const ext = path.extname(filepath).toLowerCase();

        // Only scan executable/script files
        const scannable = ['.exe','.dll','.bat','.ps1','.vbs','.js','.py','.php','.cmd','.msi'];
        if (!scannable.includes(ext)) continue;

        // Build basic feature vector (static analysis)
        const stats    = fs.statSync(filepath);
        const features = { file_size: stats.size, file_written: 1 };

        const { data } = await axios.post(
          `${process.env.AI_SERVICE_URL}/scan`,
          { features, filename, source: 'usb' }
        );

        if (data.is_malicious) {
          let blocked = false;
          try {
            fs.unlinkSync(filepath);
            blocked = true;
          } catch {}

          await Threat.create({
            user_id:      req.user.id,
            session_id:   session.id,
            filename,
            filepath,
            threat_name:  data.threat_type,
            threat_type:  data.threat_type,
            severity:     data.threat_score > 0.85 ? 'critical' : 'high',
            ai_score:     data.threat_score,
            action_taken: blocked ? 'deleted' : 'pending',
            is_blocked:   blocked,
            source:       'usb',
          });

          req.app.get('io').emit('threat_detected', {
            userId: req.user.id, filename, filepath, blocked, ...data
          });

          results.push({ filepath, verdict: 'MALICIOUS', blocked });
        } else {
          results.push({ filepath, verdict: 'CLEAN' });
        }
      } catch {}
    }

    const secs = Math.floor((Date.now() - new Date(session.started_at)) / 1000);
    await session.update({ ended_at: new Date(), duration_sec: secs, status: 'completed' });

    res.json({ scanned: files.length, threats: results.filter(r => r.verdict === 'MALICIOUS'), results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/scan/start-session
router.post('/start-session', auth, async (req, res) => {
  try {
    const session = await ScanSession.create({
      user_id: req.user.id, scan_type: req.body.type || 'realtime'
    });
    res.json(session);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/scan/end-session/:id
router.post('/end-session/:id', auth, async (req, res) => {
  try {
    const session = await ScanSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ error: 'Not found' });
    const secs = Math.floor((Date.now() - new Date(session.started_at)) / 1000);
    await session.update({ ended_at: new Date(), duration_sec: secs, status: 'completed' });
    res.json(session);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/scan/threats
router.get('/threats', auth, async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? {} : { user_id: req.user.id };
    const threats = await Threat.findAll({
      where, order: [['detected_at', 'DESC']], limit: 200,
      include: [{ model: require('../models').User, attributes: ['username','email'] }]
    });
    res.json(threats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/scan/stats  — for Chart.js
router.get('/stats', auth, async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const where = req.user.role === 'admin' ? '' : `WHERE t.user_id = ${req.user.id}`;

    const byType = await sequelize.query(`
      SELECT threat_type, COUNT(*) as count
      FROM threats t ${where}
      GROUP BY threat_type`, { type: sequelize.QueryTypes.SELECT });

    const bySeverity = await sequelize.query(`
      SELECT severity, COUNT(*) as count
      FROM threats t ${where}
      GROUP BY severity`, { type: sequelize.QueryTypes.SELECT });

    const byDay = await sequelize.query(`
      SELECT DATE(detected_at) as day, COUNT(*) as count
      FROM threats t ${where}
      GROUP BY DATE(detected_at)
      ORDER BY day DESC LIMIT 30`, { type: sequelize.QueryTypes.SELECT });

    const bySource = await sequelize.query(`
      SELECT source, COUNT(*) as count
      FROM threats t ${where}
      GROUP BY source`, { type: sequelize.QueryTypes.SELECT });

    res.json({ byType, bySeverity, byDay, bySource });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;