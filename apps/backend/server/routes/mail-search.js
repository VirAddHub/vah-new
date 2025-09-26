const express = require("express");
const { db } = require("../db");
const router = express.Router();

/**
 * GET /api/search/mail?q=term&limit=20&offset=0
 * Fields searched: subject, sender_name (case-insensitive LIKE).
 * Sort: newest first.
 */
router.get("/search/mail", (req, res) => {
    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    if (!q) return res.json({ total: 0, items: [] });

    // simple LIKE across indexed columns
    const like = `%${q}%`;

    const rows = db.prepare(`
    SELECT m.id, m.user_id, m.subject, m.sender_name, m.received_date, m.status, m.created_at
    FROM mail_item m
    WHERE (m.subject LIKE @like OR m.sender_name LIKE @like)
    ORDER BY datetime(m.created_at) DESC
    LIMIT @limit OFFSET @offset
  `).all({ like, limit, offset });

    const totalRow = db.prepare(`
    SELECT COUNT(*) AS c
    FROM mail_item m
    WHERE (m.subject LIKE @like OR m.sender_name LIKE @like)
  `).get({ like });

    return res.json({ total: totalRow.c || 0, items: rows });
});

module.exports = router;
