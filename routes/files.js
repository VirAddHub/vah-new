const express = require("express");
const { db } = require("../server/db.js");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));

const router = express.Router();

// Audit table and rate limiting helpers
function ensureLinkAuditTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS file_link_audit (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            file_id INTEGER NOT NULL,
            cached INTEGER NOT NULL,
            ok INTEGER NOT NULL,
            err TEXT,
            ip TEXT,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS fla_user_created ON file_link_audit(user_id, created_at DESC);
    `);
}

function rateLimited(userId) {
    // <= 30 requests in the last 60s per user
    const since = Date.now() - 60 * 1000;
    const count = db.prepare(`
        SELECT COUNT(*) AS c FROM file_link_audit WHERE user_id=? AND created_at>?
    `).get(userId, since).c;
    return count >= 30;
}

/** GET /api/files?mail_item_id=&deleted=&limit=&offset=
 * - user-scoped list
 * - defaults: deleted=0, order by created_at desc
 */
router.get("/", (req, res) => {
    const userId = Number(req.user?.id || 0);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

    const mailItemId = req.query.mail_item_id ? Number(req.query.mail_item_id) : null;
    const deleted = (req.query.deleted ?? "0") === "1" ? 1 : 0;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const rows = db.prepare(`
        SELECT id, user_id, mail_item_id, name, path, size, mime, etag,
               web_url, share_url, share_expires_at, deleted,
               created_at, updated_at
        FROM file
        WHERE user_id = ?
          AND (? IS NULL OR mail_item_id = ?)
          AND deleted = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(userId, mailItemId, mailItemId, deleted, limit, offset);

    return res.json({ ok: true, items: rows, limit, offset });
});

/** POST /api/files/:id/signed-url */
router.post("/:id/signed-url", async (req, res) => {
    ensureLinkAuditTable();
    const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();

    const userId = Number(req.user?.id || 0);
    if (!userId) {
        return res.status(401).json({ ok: false, error: "unauthenticated" });
    }

    if (rateLimited(userId)) {
        // audit and 429
        db.prepare(`INSERT INTO file_link_audit(user_id,file_id,cached,ok,err,ip,created_at)
                    VALUES (?,?,?,?,?,?,?)`).run(userId, Number(req.params.id || 0), 0, 0, "rate_limited", ip, Date.now());
        return res.status(429).json({ ok: false, error: "rate_limited" });
    }

    const id = Number(req.params.id || 0);
    if (!id) {
        return res.status(400).json({ ok: false, error: "bad_id" });
    }
    const f = db.prepare(`SELECT * FROM file WHERE id=?`).get(id);
    if (!f || f.user_id !== userId) {
        return res.status(404).json({ ok: false, error: "not_found" });
    }

    // Downloads are allowed even after storage expiry (per ALLOW_DOWNLOAD_AFTER_EXPIRY=true)
    // Only block if the file was hard-deleted from OneDrive
    if (f.deleted) {
        db.prepare(`INSERT INTO file_link_audit(user_id,file_id,cached,ok,err,ip,created_at)
                    VALUES (?,?,?,?,?,?,?)`).run(userId, id, 0, 0, "gone", ip, Date.now());
        return res.status(410).json({ ok: false, error: "gone" });
    }

    // cache hit?
    const soon = Date.now() + 60 * 1000; // 60s safety window
    if (f.share_url && f.share_expires_at && f.share_expires_at > soon) {
        db.prepare(`INSERT INTO file_link_audit(user_id,file_id,cached,ok,err,ip,created_at)
                    VALUES (?,?,?,?,?,?,?)`).run(userId, id, 1, 1, null, ip, Date.now());
        return res.json({ ok: true, url: f.share_url, expires_at: f.share_expires_at, cached: true });
    }

    const hookUrl = process.env.MAKE_SIGN_DOWNLOAD_URL || "";
    if (!hookUrl) {
        db.prepare(`INSERT INTO file_link_audit(user_id,file_id,cached,ok,err,ip,created_at)
                    VALUES (?,?,?,?,?,?,?)`).run(userId, id, 0, 0, "sign_service_unavailable", ip, Date.now());
        return res.status(500).json({ ok: false, error: "sign_service_unavailable" });
    }

    try {
        const resp = await fetch(hookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                secret: process.env.MAKE_SIGN_DOWNLOAD_SECRET || "",
                driveId: f.drive_id,
                itemId: f.item_id,
                path: f.path,
                name: f.name,
                mime: f.mime,
            })
        });
        const j = await resp.json();
        if (!resp.ok || !j?.url) {
            db.prepare(`INSERT INTO file_link_audit(user_id,file_id,cached,ok,err,ip,created_at)
                        VALUES (?,?,?,?,?,?,?)`).run(userId, id, 0, 0, "sign_failed", ip, Date.now());
            return res.status(502).json({ ok: false, error: "sign_failed", detail: j });
        }
        const expires = Number(j.expires_at || 0) || (Date.now() + 15 * 60 * 1000);
        db.prepare(`UPDATE file SET share_url=?, share_expires_at=?, updated_at=? WHERE id=?`)
            .run(String(j.url), expires, Date.now(), f.id);

        db.prepare(`INSERT INTO file_link_audit(user_id,file_id,cached,ok,err,ip,created_at)
                    VALUES (?,?,?,?,?,?,?)`).run(userId, id, 0, 1, null, ip, Date.now());
        return res.json({ ok: true, url: j.url, expires_at: expires, cached: false });
    } catch (e) {
        db.prepare(`INSERT INTO file_link_audit(user_id,file_id,cached,ok,err,ip,created_at)
                    VALUES (?,?,?,?,?,?,?)`).run(userId, id, 0, 0, "sign_error", ip, Date.now());
        return res.status(502).json({ ok: false, error: "sign_error" });
    }
});

module.exports = router;
