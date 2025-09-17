const express = require('express');
const { db, DB_CLIENT } = require('../db');
const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    await db.get('SELECT 1', []);
    return res.status(200).json({
      ok: true,
      db: DB_CLIENT,
      uptime: process.uptime(),
      ts: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ 
      ok: false, 
      error: e.message, 
      db: DB_CLIENT,
      uptime: process.uptime(),
      ts: new Date().toISOString()
    });
  }
});

module.exports = router;
