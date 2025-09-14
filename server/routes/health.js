const express = require('express');
const router = express.Router();
router.get('/health', (_req, res) => res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    ts: new Date().toISOString()
}));
module.exports = router;
