const express = require("express");
const { db } = require("../lib/db");
const router = express.Router();

/** GET /api/profile/email-prefs */
router.get("/email-prefs", (req, res) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });
  const row = db.prepare(`
    SELECT email_pref_marketing AS marketing,
           email_pref_product   AS product,
           email_pref_security  AS security,
           email_unsubscribed_at AS unsubscribedAt,
           email_bounced_at      AS bouncedAt
    FROM user WHERE id = ?
  `).get(userId);
  return res.json({ ok: true, prefs: row || null });
});

/** POST /api/profile/email-prefs  body: { marketing?, product?, security? } */
router.post("/email-prefs", (req, res) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });
  const { marketing, product, security } = req.body || {};
  const fields = [], args = [];
  if (typeof marketing === "boolean") { fields.push("email_pref_marketing = ?"); args.push(marketing ? 1 : 0); }
  if (typeof product   === "boolean") { fields.push("email_pref_product   = ?"); args.push(product ? 1 : 0); }
  if (typeof security  === "boolean") { fields.push("email_pref_security  = ?"); args.push(security ? 1 : 0); }
  if (!fields.length) return res.status(400).json({ ok: false, error: "no_changes" });
  db.prepare(`UPDATE user SET ${fields.join(", ")} WHERE id = ?`).run(...args, userId);
  return res.json({ ok: true });
});

module.exports = router;
