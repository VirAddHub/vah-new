const express = require("express");
const { db } = require("../server/db.js");
const { unreadCount } = require("../lib/notify");

const router = express.Router();

/** GET /api/notifications?limit=&offset=&unreadOnly=true|false */
router.get("/", (req, res) => {
    const userId = Number(req.user?.id || 0);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const unreadOnly = String(req.query.unreadOnly || "false") === "true";

    const where = ["user_id = ?"];
    const args = [userId];
    if (unreadOnly) { where.push("read_at IS NULL"); }

    const items = db.prepare(`
    SELECT id, type, title, body, meta, created_at, read_at
    FROM notification
    WHERE ${where.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...args, limit, offset).map(n => ({ ...n, meta: n.meta ? JSON.parse(n.meta) : null }));

    const total = db.prepare(`
    SELECT COUNT(*) AS c FROM notification WHERE ${where.join(" AND ")}
  `).get(...args).c;

    const unread = unreadCount(userId);
    res.json({ ok: true, total, unread, items });
});

/** POST /api/notifications/mark-read { ids?: number[] } */
router.post("/mark-read", (req, res) => {
    const userId = Number(req.user?.id || 0);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : null;
    const now = Date.now();

    if (ids && ids.length) {
        const stmt = db.prepare(`UPDATE notification SET read_at=? WHERE user_id=? AND id IN (${ids.map(() => "?").join(",")})`);
        const info = stmt.run(now, userId, ...ids);
        return res.json({ ok: true, updated: info.changes });
    }
    const info = db.prepare(`UPDATE notification SET read_at=? WHERE user_id=? AND read_at IS NULL`).run(now, userId);
    return res.json({ ok: true, updated: info.changes });
});

module.exports = router;
