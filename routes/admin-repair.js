const express = require("express");
const router = express.Router();

// Disable legacy FTS repair endpoints to prevent DB corruption
router.post("/fts", (_req, res) => {
    return res.status(410).json({ error: "FTS is disabled in this build." });
});

router.post("/fts/rebuild", (_req, res) => {
    return res.status(410).json({ error: "FTS is disabled in this build." });
});

router.post("/backfill-expiry", (req, res) => {
    if (!isAllowed(req)) return res.status(403).json({ ok: false, error: "forbidden" });
    const days = Number(process.env.STORAGE_RETENTION_DAYS || 14);
    const delta = days * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const tx = db.transaction(() => {
        const updated = db.prepare(`
      UPDATE mail_item
         SET storage_expires_at = created_at + ?
       WHERE storage_expires_at IS NULL
         AND created_at IS NOT NULL
    `).run(delta).changes;

        // FTS removed to prevent database corruption

        return updated;
    });

    const updated = tx();
    return res.json({ ok: true, updated, days, now });
});

module.exports = router;
