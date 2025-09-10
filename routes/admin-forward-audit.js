const express = require("express");
const { db } = require("../server/db.js");
const router = express.Router();

router.get("/", (req, res) => {
  if (!req.user?.is_admin && process.env.NODE_ENV === "production") {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
  const { mail_item_id, limit = 50, offset = 0 } = req.query;
  const rows = db.prepare(`
    SELECT id, mail_item_id, user_id, result, reason, created_at
    FROM forward_audit
    ${mail_item_id ? "WHERE mail_item_id = ?" : ""}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...(mail_item_id ? [Number(mail_item_id), Number(limit), Number(offset)] : [Number(limit), Number(offset)]));
  res.json({ ok: true, items: rows });
});

module.exports = router;
