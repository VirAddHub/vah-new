const express = require("express");
const path = require("path");
const fs = require("fs");
const { db } = require("../server/db");
const { runGdprExport } = require("../lib/gdpr-export");

const router = express.Router();

/** POST /api/profile/gdpr/export/request */
router.post("/export/request", async (req, res) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

  try {
    // throttle: if a pending/running job exists or a completed in last 12h, return that
    const recent = await db.get(`
      SELECT * FROM export_job
      WHERE user_id=? AND type='gdpr_v1'
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    const twelveHours = 12 * 60 * 60 * 1000;
    const now = Date.now();
    if (recent && (recent.status === "pending" || recent.status === "running" || (recent.status === "done" && (now - recent.created_at) < twelveHours))) {
      return res.status(202).json({ ok: true, job: shape(recent) });
    }

    const result = await db.run(`
      INSERT INTO export_job (user_id, type, status, created_at)
      VALUES (?, 'gdpr_v1', 'pending', ?)
    `, [userId, now]);
    const jobId = result.insertId || result.lastInsertRowid;

    // kick async job
    setImmediate(() => runGdprExport(jobId));

    const job = await db.get(`SELECT * FROM export_job WHERE id=?`, [jobId]);
    return res.status(202).json({ ok: true, job: shape(job) });
  } catch (e) {
    if (e?.code === '42P01') {
      return res.status(503).json({ ok: false, error: "export_job table not available" });
    }
    console.error('[gdpr-export] error:', e?.message || e);
    return res.status(500).json({ ok: false, error: "internal error" });
  }
});

/** GET /api/profile/gdpr/export/status */
router.get("/export/status", async (req, res) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

  try {
    const row = await db.get(`
      SELECT * FROM export_job WHERE user_id=? AND type='gdpr_v1' ORDER BY created_at DESC LIMIT 1
    `, [userId]);
    if (!row) return res.json({ ok: true, job: null });
    return res.json({ ok: true, job: shape(row) });
  } catch (e) {
    if (e?.code === '42P01') {
      return res.status(503).json({ ok: false, error: "export_job table not available" });
    }
    console.error('[gdpr-export-status] error:', e?.message || e);
    return res.status(500).json({ ok: false, error: "internal error" });
  }
});

// helper to hide paths and expose a download URL token
function shape(j) {
  if (!j) return null;
  const base = process.env.APP_ORIGIN || "http://localhost:3000";
  const expiresAt = j.expires_at; // Use only expires_at for now
  const download = (j.status === "done" && j.token && expiresAt && Date.now() < expiresAt)
    ? `${base}/api/bff/downloads/export/${j.token}` : null;
  return {
    id: j.id, status: j.status,
    created_at: j.created_at, started_at: j.started_at, completed_at: j.completed_at,
    error: j.error || null,
    size: j.file_size || null,
    download, expires_at: expiresAt || null,
  };
}

module.exports = router;
