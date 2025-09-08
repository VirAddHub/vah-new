const express = require("express");
const { db } = require("../lib/db");
const router = express.Router();

/**
 * GET /api/mail/search?q=&limit=&offset=&tag=&status=&deleted=true|false
 * Returns only current user's mail.
 */
router.get("/search", (req, res) => {
    const userId = Number(req.user?.id || 0);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

    const q = String(req.query.q || "").trim();
    const limit = Math.max(0, Math.min(100, Number(req.query.limit || 20)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const tag = String(req.query.tag || "").trim();
    const status = String(req.query.status || "").trim();
    const includeDeleted = req.query.deleted === "true";

    const where = ["m.user_id = ?"];
    const args = [userId];
    if (!includeDeleted) where.push("(m.deleted IS NULL OR m.deleted = 0)");
    if (tag) { where.push("m.tag = ?"); args.push(tag); }
    if (status) { where.push("m.status = ?"); args.push(status); }

    if (q) {
        try {
            const sql = `
        SELECT m.id, m.created_at, m.subject, m.sender_name, m.tag, m.status, m.scanned, m.deleted,
               bm25(mail_item_fts) AS score
        FROM mail_item_fts
        JOIN mail_item m ON m.id = mail_item_fts.rowid
        WHERE mail_item_fts MATCH ? AND ${where.join(" AND ")}
        ORDER BY score ASC, m.created_at DESC
        LIMIT ? OFFSET ?`;
            const items = db.prepare(sql).all(q, ...args, limit, offset);
            const total = db.prepare(
                `SELECT COUNT(*) AS c FROM mail_item_fts JOIN mail_item m ON m.id=mail_item_fts.rowid WHERE mail_item_fts MATCH ? AND ${where.join(" AND ")}`
            ).get(q, ...args).c;
            return res.json({ ok: true, total, items });
        } catch (_) { /* fall back to LIKE */ }
    }

    const likeQ = `%${q.replace(/[%_]/g, "")}%`;
    const sql = `
    SELECT m.id, m.created_at, m.subject, m.sender_name, m.tag, m.status, m.scanned, m.deleted
    FROM mail_item m
    WHERE ${where.join(" AND ")}
      ${q ? "AND (m.subject LIKE ? OR m.sender_name LIKE ? OR m.notes LIKE ? OR m.tag LIKE ?)" : ""}
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?`;
    const likeArgs = q ? [...args, likeQ, likeQ, likeQ, likeQ, limit, offset] : [...args, limit, offset];
    const items = db.prepare(sql).all(...likeArgs);

    const countSql = `
    SELECT COUNT(*) AS c FROM mail_item m
    WHERE ${where.join(" AND ")}
      ${q ? "AND (m.subject LIKE ? OR m.sender_name LIKE ? OR m.notes LIKE ? OR m.tag LIKE ?)" : ""}`;
    const total = db.prepare(countSql).get(...(q ? [...args, likeQ, likeQ, likeQ, likeQ] : args)).c;

    return res.json({ ok: true, total, items });
});

module.exports = router;
