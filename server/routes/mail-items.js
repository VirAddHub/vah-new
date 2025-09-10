const express = require("express");
const crypto = require("node:crypto");
const { db } = require("../db.js");
const router = express.Router();

// GET /api/mail-items/:id/scan-url  → returns { url, expires_at }
router.get("/mail-items/:id/scan-url", async (req, res) => {
    try {
        const id = req.params.id;

        const item = db.prepare(`
      SELECT id, user_id, scan_file_url
      FROM mail_item
      WHERE id = ?
    `).get(id);

        if (!item || !item.scan_file_url) {
            if (process.env.DEV_MODE === "1") {
                return res.status(404).json({ error: "Scan not found or not attached", debug: { found: !!item, hasScan: !!(item && item.scan_file_url) } });
            }
            return res.status(404).json({ error: "Not found" });
        }

        const user = req.user || {};
        const isAdmin = user?.role === "admin";
        const isOwner = user?.id && Number(user.id) === Number(item.user_id);
        if (!isAdmin && !isOwner) return res.status(404).json({ error: "Not found" });

        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        db.prepare(`
      INSERT INTO scan_tokens (token, mail_item_id, issued_to, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, item.id, isAdmin ? null : Number(user.id), expiresAt);

        const base = `${req.protocol}://${req.get("host")}`;
        return res.json({ url: `${base}/api/scans/${token}`, expires_at: expiresAt });
    } catch (e) {
        return res.status(500).json({ error: e.message || "Failed to issue scan URL" });
    }
});

// GET /api/scans/:token  → single-use, then stream/redirect
router.get("/scans/:token", async (req, res) => {
    try {
        const t = req.params.token;
        const row = db.prepare(`
      SELECT t.token, t.mail_item_id, t.issued_to, t.expires_at, t.used, m.scan_file_url
      FROM scan_tokens t
      JOIN mail_item m ON m.id = t.mail_item_id
      WHERE t.token = ?
    `).get(t);

        if (!row) return res.status(404).send("Not found");
        if (row.used) return res.status(410).send("Link already used");
        if (new Date(row.expires_at).getTime() < Date.now()) return res.status(410).send("Link expired");

        // Optional: if you want session binding, enforce here:
        // if (row.issued_to && Number(row.issued_to) !== Number(req.user?.id)) return res.status(403).send("Forbidden");

        const tx = db.transaction((tok) => {
            db.prepare(`UPDATE scan_tokens SET used = 1 WHERE token = ?`).run(tok);
            // Note: mail_audit table might not exist, so we'll skip that for now
            // db.prepare(`INSERT INTO mail_audit (mail_item_id, action, actor, meta)
            //             VALUES (?, 'url_issue', 'system', json('{"consume":true}'))`)
            //   .run(row.mail_item_id);
        });
        tx(t);

        // TODO: replace with real OneDrive streaming/redirect
        return res.json({ ok: true, file_url: row.scan_file_url });
    } catch (e) {
        return res.status(500).send("Server error");
    }
});

module.exports = router;
