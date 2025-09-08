const express = require("express");
const path = require("path");
const fs = require("fs");
const { db } = require("../lib/db");
const { runGdprExport } = require("../lib/gdpr-export");

const router = express.Router();

/** POST /api/profile/gdpr/export/request */
router.post("/export/request", async (req, res) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

  // throttle: if a pending/running job exists or a completed in last 12h, return that
  const recent = db.prepare(`
    SELECT * FROM export_job
    WHERE user_id=? AND type='gdpr_v1'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId);

  const twelveHours = 12 * 60 * 60 * 1000;
  const now = Date.now();
  if (recent && (recent.status === "pending" || recent.status === "running" || (recent.status === "done" && (now - recent.created_at) < twelveHours))) {
    return res.status(202).json({ ok: true, job: shape(recent) });
  }

  const info = db.prepare(`
    INSERT INTO export_job (user_id, type, status, created_at)
    VALUES (?, 'gdpr_v1', 'pending', ?)
  `).run(userId, now);
  const jobId = info.lastInsertRowid;

  // kick async job
  setImmediate(() => runGdprExport(jobId));

  const job = db.prepare(`SELECT * FROM export_job WHERE id=?`).get(jobId);
  return res.status(202).json({ ok: true, job: shape(job) });
});

/** GET /api/profile/gdpr/export/status */
router.get("/export/status", (req, res) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });
  const row = db.prepare(`
    SELECT * FROM export_job WHERE user_id=? AND type='gdpr_v1' ORDER BY created_at DESC LIMIT 1
  `).get(userId);
  if (!row) return res.json({ ok: true, job: null });
  return res.json({ ok: true, job: shape(row) });
});

// helper to hide paths and expose a download URL token
function shape(j) {
  if (!j) return null;
  const base = process.env.APP_ORIGIN || "http://localhost:3000";
  const download = (j.status === "done" && j.token && j.expires_at && Date.now() < j.expires_at)
    ? `${base}/api/bff/downloads/export/${j.token}` : null;
  return {
    id: j.id, status: j.status,
    created_at: j.created_at, started_at: j.started_at, completed_at: j.completed_at,
    error: j.error || null,
    size: j.file_size || null,
    download, expires_at: j.expires_at || null,
  };
}

module.exports = router;
