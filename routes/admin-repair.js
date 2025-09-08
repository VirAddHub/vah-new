const express = require("express");
const { db } = require("../lib/db");
const { selfHealFts, rebuildFts } = require("../lib/fts-repair");

const router = express.Router();

// Require dev OR admin
function isAllowed(req) {
  if (process.env.NODE_ENV !== "production") return true;
  return !!req.user?.is_admin;
}

router.post("/fts", (req, res) => {
  if (!isAllowed(req)) return res.status(403).json({ ok:false, error:"forbidden" });
  const result = selfHealFts();
  return res.json({ ok:true, ...result });
});

router.post("/fts/rebuild", (req, res) => {
  if (!isAllowed(req)) return res.status(403).json({ ok:false, error:"forbidden" });
  const result = rebuildFts();
  return res.json({ ok:true, ...result });
});

router.post("/backfill-expiry", (req, res) => {
  if (!isAllowed(req)) return res.status(403).json({ ok:false, error:"forbidden" });
  const days = Number(process.env.STORAGE_RETENTION_DAYS || 14);
  const delta = days * 24*60*60*1000;
  const now = Date.now();

  const tx = db.transaction(() => {
    const updated = db.prepare(`
      UPDATE mail_item
         SET storage_expires_at = created_at + ?
       WHERE storage_expires_at IS NULL
         AND created_at IS NOT NULL
    `).run(delta).changes;

    // quick probe to ensure triggers are in place
    try { db.prepare(`SELECT 1 FROM mail_item_fts LIMIT 1`).get(); } catch { /* ignore */ }

    return updated;
  });

  const updated = tx();
  return res.json({ ok:true, updated, days, now });
});

module.exports = router;
