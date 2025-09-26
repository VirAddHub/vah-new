const express = require("express");
const { db } = require("../server/db");
const { runCleanupOnceLocked } = require("../lib/gdpr-export");

const router = express.Router();

// GET /api/debug/export-jobs/ping -> { ok: true, count }
router.get("/export-jobs/ping", async (req, res) => {
    try {
        const rows = await db.all('SELECT count(*)::int AS count FROM export_job');
        res.json({ ok: true, count: rows?.[0]?.count ?? 0 });
    } catch (e) {
        res.status(500).json({ ok: false, code: e?.code, message: e?.message });
    }
});

// POST /api/debug/export-jobs/run-once -> { ok: true, cleaned: number }
router.post("/export-jobs/run-once", async (req, res) => {
    try {
        const result = await runCleanupOnceLocked();
        res.json({ ok: true, ...result });
    } catch (e) {
        if (e?.code === '42P01') {
            res.status(503).json({ ok: false, code: e.code, message: "export_job table not available" });
        } else {
            res.status(500).json({ ok: false, code: e?.code, message: e?.message });
        }
    }
});

module.exports = router;
