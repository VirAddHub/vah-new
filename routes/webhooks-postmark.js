const express = require("express");
const { db } = require("../server/db.js");
const router = express.Router();

function basicAuthOk(req) {
  const user = process.env.POSTMARK_WEBHOOK_USER || "";
  const pass = process.env.POSTMARK_WEBHOOK_PASS || "";
  const hdr = req.headers.authorization || "";
  if (!user || !pass) return process.env.NODE_ENV !== "production"; // dev fallback if not configured
  if (!hdr.startsWith("Basic ")) return false;
  const decoded = Buffer.from(hdr.slice(6).trim(), "base64").toString("utf8");
  const [u, p] = decoded.split(":");
  return u === user && p === pass;
}

function ipAllowed(req) {
  const allow = (process.env.POSTMARK_ALLOWED_IPS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (!allow.length) return true; // no list → allow
  // behind proxy: trust proxy is already set in server.js
  const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
  return allow.includes(ip);
}

/**
 * POST /api/webhooks/postmark
 * Handles: Delivery, Bounce, SpamComplaint, Open, Click, SubscriptionChange, Inbound
 */
router.post("/", (req, res) => {
  if (!basicAuthOk(req) || !ipAllowed(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const ev = req.body || {};
  const type = ev.RecordType || ev.Record?.Type || ""; // Postmark uses RecordType

  // Try to resolve a user by email (customize to your app)
  // For outbound events, you'll often have "Recipient". For inbound, "FromEmail".
  const email = ev.Recipient || ev.Email || ev.From || ev.FromEmail || null;
  const user = email ? db.prepare("SELECT id FROM user WHERE email = ?").get(email) : null;
  const userId = user?.id || null;

  const now = Date.now();

  // Minimal handling
  if (type === "Bounce") {
    // Hard bounce / spam complaints → pause non-critical emails
    db.prepare(`
      UPDATE user SET email_bounced_at = COALESCE(email_bounced_at, ?)
      WHERE id = ?
    `).run(now, userId);
  }

  if (type === "SubscriptionChange") {
    // ev.SuppressSending: true if unsubscribed (for that Stream)
    const unsub = ev.SuppressSending === true;
    db.prepare(`
      UPDATE user SET email_unsubscribed_at = ?
      WHERE id = ?
    `).run(unsub ? now : null, userId);
  }

  // Optional: store a lightweight audit (truncate raw)
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS postmark_event (
        id INTEGER PRIMARY KEY,
        created_at INTEGER NOT NULL,
        type TEXT,
        email TEXT,
        user_id INTEGER,
        payload TEXT
      )
    `).run();

    db.prepare(`
      INSERT INTO postmark_event (created_at, type, email, user_id, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(now, type, email, userId, JSON.stringify(ev).slice(0, 50000));
  } catch { }

  return res.json({ ok: true });
});

module.exports = router;
