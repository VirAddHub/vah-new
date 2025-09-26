const express = require("express");
const crypto = require("crypto");
const dayjs = require('dayjs');

const router = express.Router();

// Use centralized database connection
const { db } = require('../server/db');

// Import invoice functions
const { createInvoiceFromPayment } = require('../server/services/invoice');

// Import email templates
const { emailInvoiceSent } = require('../server/mailer-templates');

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

router.post("/", async (req, res) => {
  const secret = process.env.GC_WEBHOOK_SECRET || "";
  const headerSig = req.header("Webhook-Signature");
  const raw = req.body; // Buffer

  // Skip signature verification in development mode
  if (process.env.NODE_ENV !== 'production' && !secret) {
    console.log('Skipping signature verification in development mode');
  } else if (!verify(raw, headerSig, secret)) {
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

  // Process events sequentially to handle async operations
  for (const ev of events) {
    const rt = ev.resource_type;
    const action = ev.action;
    const links = ev.links || {};

    // Handle payment events
    if (rt === "payments" && action === "confirmed") {
      const paymentId = links.payment;
      if (paymentId) {
        // Find user by GoCardless customer ID
        const user = db.prepare(`
          SELECT u.*, p.* FROM user u 
          LEFT JOIN plans p ON u.plan_id = p.id 
          WHERE u.gocardless_customer_id = ?
        `).get(ev.links?.customer);

        if (user) {
          // Update user status
          db.prepare(`UPDATE user SET plan_status='active' WHERE id=?`).run(user.id);

          // Generate invoice
          try {
            const gcPayment = {
              id: paymentId,
              amount: ev.details?.amount || 999, // fallback amount in pence
              charge_date: dayjs().format('YYYY-MM-DD')
            };

            const invoice = await createInvoiceFromPayment({ user, plan: user, gcPayment });

            // Send email with invoice using new email system
            await emailInvoiceSent({
              to: user.email,
              first_name: user.first_name || 'there',
              amountPennies: invoice.amount_pence,
              periodStart: invoice.period_start,
              periodEnd: invoice.period_end,
              oneTimeToken: invoice.token
            });
          } catch (invoiceError) {
            console.error('Invoice generation failed', invoiceError);
          }
        }
      }
    }

    // Handle mandate events
    if (rt === "mandates" && links.mandate) {
      // naive: if any user has this mandate, consider DD active
      db.prepare(`
        UPDATE user
        SET gocardless_mandate_id = COALESCE(gocardless_mandate_id, ?)
        WHERE gocardless_mandate_id = ? OR gocardless_mandate_id IS NULL
      `).run(links.mandate, links.mandate);
    }

    // Record events to audit table
    db.prepare(`
      INSERT INTO webhook_log (created_at, type, source, raw_payload, received_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(now, 'gocardless', 'webhook', JSON.stringify(ev), now);
  }

  return res.json({ ok: true, received: events.length });
});

module.exports = router;
