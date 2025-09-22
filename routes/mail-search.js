const express = require("express");
const { db } = require("../server/db");
const { timeDb } = require("../lib/metrics");
const router = express.Router();

/**
 * GET /api/mail-items/search?q=&limit=&offset=&tag=&status=&deleted=true|false
 * Dev helpers:
 *   - Authorization: Bearer <jwt> OR x-dev-user-id: <id>
 *   - ?userId=<id> allowed in non-production
 *   - ?debug=true returns SQL + args + db file path
 */
router.get("/search", (req, res) => {
    // --- resolve userId (auth cookie/bearer; dev overrides)
    let userId = Number(req.user?.id || 0);
    if (!userId && process.env.NODE_ENV !== "production") {
        const hdr = Number(req.header("x-dev-user-id") || 0);
        if (hdr) userId = hdr;
        const qid = Number(req.query.userId || 0);
        if (!userId && qid) userId = qid;
    }
    if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

    const q = String(req.query.q || "").trim();
    const limit = Math.max(0, Math.min(100, Number(req.query.limit || 20)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const tag = String(req.query.tag || "").trim();
    const status = String(req.query.status || "").trim();
    const includeDeleted = req.query.deleted === "true";
    const wantDebug = req.query.debug === "true" && process.env.NODE_ENV !== "production";

    const where = ["m.user_id = ?"];
    const args = [userId];
    if (!includeDeleted) where.push("(m.deleted IS NULL OR m.deleted = 0)");
    if (tag) { where.push("m.tag = ?"); args.push(tag); }
    if (status) { where.push("m.status = ?"); args.push(status); }

    // helper to attach debug info
    const attachDebug = (payload, usedSql, usedArgs, usedPlan) => {
        if (!wantDebug) return payload;
        try {
            const dbFile = db.prepare("PRAGMA database_list").all().find(r => r.name === "main")?.file || "unknown";
            return { ...payload, _debug: { dbFile, sql: usedSql, args: usedArgs, plan: usedPlan } };
        } catch (_) {
            return payload;
        }
    };

    // --- FTS branch
    if (q) {
        // FTS disabled to prevent database corruption - using LIKE search instead
        try {
            const sql = `
        SELECT m.id, m.created_at, m.subject, m.sender_name, m.tag, m.status, m.scanned, m.deleted,
               m.file_id, m.forwarding_status, m.expires_at
        FROM mail_item m
        WHERE (m.subject LIKE ? OR m.sender_name LIKE ? OR m.tag LIKE ? OR m.notes LIKE ?) AND ${where.join(" AND ")}
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?`;
            const searchTerm = `%${q}%`;
            const items = timeDb("all", () => db.prepare(sql).all(searchTerm, searchTerm, searchTerm, searchTerm, ...args, limit, offset));
            const total = timeDb("get", () => db.prepare(
                `SELECT COUNT(*) AS c FROM mail_item m WHERE (m.subject LIKE ? OR m.sender_name LIKE ? OR m.tag LIKE ? OR m.notes LIKE ?) AND ${where.join(" AND ")}`
            ).get(searchTerm, searchTerm, searchTerm, searchTerm, ...args)).c;

            return res.json(attachDebug({ ok: true, total, items }, sql, [searchTerm, searchTerm, searchTerm, searchTerm, ...args, limit, offset], "like"));
        } catch (e) {
            // fall through to LIKE
            console.warn("Search failed:", e.message);
        }
    }

    // --- LIKE fallback / empty q
    const likeQ = `%${q.replace(/[%_]/g, "")}%`;
    const sql = `
    SELECT m.id, m.created_at, m.subject, m.sender_name, m.tag, m.status, m.scanned, m.deleted,
           m.file_id, m.forwarding_status, m.expires_at
    FROM mail_item m
    WHERE ${where.join(" AND ")}
      ${q ? "AND (m.subject LIKE ? OR m.sender_name LIKE ? OR m.notes LIKE ? OR m.tag LIKE ?)" : ""}
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?`;
    const likeArgs = q ? [...args, likeQ, likeQ, likeQ, likeQ, limit, offset] : [...args, limit, offset];
    const items = timeDb("all", () => db.prepare(sql).all(...likeArgs));

    const countSql = `
    SELECT COUNT(*) AS c FROM mail_item m
    WHERE ${where.join(" AND ")}
      ${q ? "AND (m.subject LIKE ? OR m.sender_name LIKE ? OR m.notes LIKE ? OR m.tag LIKE ?)" : ""}`;
    const total = timeDb("get", () => db.prepare(countSql).get(...(q ? [...args, likeQ, likeQ, likeQ, likeQ] : args))).c;

    return res.json(attachDebug({ ok: true, total, items }, sql, likeArgs, "like"));
});

// tiny probe to confirm mount + auth
router.get("/search/test", (req, res) => {
    res.json({ ok: true, path: req.originalUrl, user: req.user || null });
});

module.exports = router;