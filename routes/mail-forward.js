const express = require("express");
const { db } = require("../lib/db");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));
const router = express.Router();

/** POST /api/mail/forward  { mail_item_id, recipient, notes? } */
router.post("/forward", async (req, res) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) return res.status(401).json({ ok:false, error:"unauthenticated" });
  const { mail_item_id, recipient, notes } = req.body || {};
  const m = db.prepare(`SELECT id, user_id FROM mail_item WHERE id=?`).get(Number(mail_item_id||0));
  if (!m || m.user_id !== userId) return res.status(404).json({ ok:false, error:"not_found" });

  // mark forwarding requested
  db.prepare(`UPDATE mail_item SET forwarding_status='Requested', updated_at=? WHERE id=?`)
    .run(Date.now(), m.id);

  // send to Make Excel webhook (optional)
  const url = process.env.MAKE_FORWARDING_LOG_URL || "";
  if (url) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          secret: process.env.MAKE_FORWARDING_LOG_SECRET || "",
          mailItemId: m.id,
          userId,
          recipient,
          notes: notes || "",
          timestamp: Date.now()
        })
      });
    } catch(_) {}
  }

  return res.json({ ok:true });
});

module.exports = router;
