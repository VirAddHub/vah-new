const express = require("express");
const crypto = require("crypto");

const router = express.Router();

// Get database instance from server.js context
let db;
router.use((req, res, next) => {
  if (!db) {
    const Database = require('better-sqlite3');
    db = new Database(process.env.DB_PATH || './vah.db');
  }
  next();
});

// GoCardless uses the 'Webhook-Signature' header and HMAC with your endpoint secret.
// Compare against the raw body bytes.
function verify(raw, headerSig, secret) {
  if (!secret || !headerSig) return false;
  const hmac = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    const a = Buffer.from(hmac);
    const b = Buffer.from(headerSig);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

router.post("/", (req, res) => {
  const secret = process.env.GC_WEBHOOK_SECRET || "";
  const headerSig = req.header("Webhook-Signature");
  const raw = req.body; // Buffer
  if (!verify(raw, headerSig, secret)) {
    return res.status(401).json({ ok: false, error: "invalid_signature" });
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  // Payload contains { events: [{ id, created_at, resource_type, action, links: { payment, mandate, customer }, details: {...} }, ...] }
  const events = Array.isArray(payload.events) ? payload.events : [];

  const now = Date.now();
  const tx = db.transaction(() => {
    for (const ev of events) {
      const rt = ev.resource_type;
      const action = ev.action;
      const links = ev.links || {};

      // Example: update mandate status on user if we have it
      if (rt === "mandates" && links.mandate) {
        // naive: if any user has this mandate, consider DD active
        db.prepare(`
          UPDATE user
          SET gocardless_mandate_id = COALESCE(gocardless_mandate_id, ?)
          WHERE gocardless_mandate_id = ? OR gocardless_mandate_id IS NULL
        `).run(links.mandate, links.mandate);
      }

      // TODO: record events to an audit table if you want
      // db.prepare(`INSERT INTO gc_event (...) VALUES (...)`).run(...)
    }
  });
  tx();

  return res.json({ ok: true, received: events.length });
});

module.exports = router;
