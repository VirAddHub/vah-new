const express = require("express");
const { db } = require("../lib/db");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));
const router = express.Router();

/** POST /api/mail/forward  { mail_item_id, recipient, notes?, adminOverride? } */
router.post("/forward", async (req, res) => {
    const userId = Number(req.user?.id || 0);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });
    const { mail_item_id, recipient, notes, adminOverride } = req.body || {};
    const m = db.prepare(`SELECT id, user_id, storage_expires_at FROM mail_item WHERE id=?`).get(Number(mail_item_id || 0));
    if (!m || m.user_id !== userId) return res.status(404).json({ ok: false, error: "not_found" });

    // Forwarding is blocked after storage expiry (unlike downloads)
    const expired = m.storage_expires_at && Date.now() > Number(m.storage_expires_at);
    if (expired && !req.user?.is_admin) {
        return res.status(403).json({ ok: false, error: "expired", message: "Forwarding period has expired for this item." });
    }
    if (expired && req.user?.is_admin && String(adminOverride) !== "true") {
        return res.status(412).json({ ok: false, error: "admin_override_required" });
    }

    // mark forwarding requested
    db.prepare(`UPDATE mail_item SET forwarding_status='Requested', updated_at=? WHERE id=?`)
        .run(Date.now(), m.id);

    // send to Make Excel webhook (optional)
    const url = process.env.MAKE_FORWARDING_LOG_URL || "";
    if (url) {
        try {
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    secret: process.env.MAKE_FORWARDING_LOG_SECRET || "",
                    mailItemId: m.id,
                    userId,
                    recipient,
                    notes: notes || "",
                    timestamp: Date.now()
                })
            });
        } catch (_) { }
    }

    return res.json({ ok: true });
});

module.exports = router;
