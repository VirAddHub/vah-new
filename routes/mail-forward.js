const express = require("express");
const { db } = require("../lib/db");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));
const { forwardingCounter } = require("../lib/metrics-forwarding");
const router = express.Router();

// Audit function for forwarding attempts
function auditForward(userId, mailId, result, reason) {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS forward_audit (
                id INTEGER PRIMARY KEY,
                mail_item_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                result TEXT NOT NULL,      -- "blocked" | "requested" | "override"
                reason TEXT,               -- "expired" | null
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS fwd_audit_mail_created ON forward_audit(mail_item_id, created_at DESC);
        `);
        db.prepare(`INSERT INTO forward_audit (mail_item_id,user_id,result,reason,created_at)
                    VALUES (?,?,?,?,?)`).run(mailId, userId, result, reason || null, Date.now());
    } catch (_) { }
}

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
        auditForward(userId, m.id, "blocked", "expired");
        forwardingCounter.inc({ result: "blocked" });
        return res.status(403).json({ ok: false, error: "expired", message: "Forwarding period has expired for this item." });
    }
    if (expired && req.user?.is_admin && String(adminOverride) !== "true") {
        auditForward(userId, m.id, "blocked", "admin_override_required");
        forwardingCounter.inc({ result: "blocked" });
        return res.status(412).json({ ok: false, error: "admin_override_required" });
    }

    // mark forwarding requested
    db.prepare(`UPDATE mail_item SET forwarding_status='Requested', updated_at=? WHERE id=?`)
        .run(Date.now(), m.id);

    // audit successful request (normal or admin override)
    auditForward(userId, m.id, expired ? "override" : "requested", null);
    forwardingCounter.inc({ result: expired ? "override" : "requested" });

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
