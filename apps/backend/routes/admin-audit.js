const express = require("express");
const { db } = require("../server/db");
const router = express.Router();

/** GET /api/admin-audit?limit=&offset= */
router.get("/", (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });

  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const offset = Math.max(0, Number(req.query.offset || 0));

  const items = db.prepare(`
    SELECT id, admin_id, action, target_type, target_id, details, created_at
    FROM admin_audit
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare(`SELECT COUNT(*) AS c FROM admin_audit`).get().c;

  res.json({ ok: true, total, items });
});

/** GET /api/admin/mail-audit?item_id=&limit=&offset= */
router.get("/mail-audit", (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });

  const itemId = Number(req.query.item_id || 0);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const offset = Math.max(0, Number(req.query.offset || 0));

  const where = [];
  const args = [];
  if (itemId) { where.push("item_id = ?"); args.push(itemId); }

  const items = db.prepare(`
    SELECT id, item_id, user_id, action, before_json, after_json, created_at
    FROM mail_audit
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...args, limit, offset).map(r => ({
    ...r,
    before: r.before_json ? JSON.parse(r.before_json) : null,
    after: r.after_json ? JSON.parse(r.after_json) : null,
  }));

  const total = db.prepare(`
    SELECT COUNT(*) AS c FROM mail_audit
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
  `).get(...args).c;

  res.json({ ok: true, total, items });
});

module.exports = router;
