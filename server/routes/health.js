// server/routes/health.js - Database health check
const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// Create a direct PostgreSQL pool for health checks
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Database health check endpoint
router.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('[health] Database connection failed:', error.message);
    res.status(500).json({
      ok: false,
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;