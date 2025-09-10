const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN || "";
const FROM = process.env.POSTMARK_FROM || "no-reply@virtualaddresshub.co.uk";
const { db } = require("./db");

/**
 * shouldSendEmail(userId, category)
 * category: 'marketing' | 'product' | 'security'
 */
function shouldSendEmail(userId, category) {
  if (!userId) return true;
  const row = db.prepare(`
    SELECT email_pref_marketing AS marketing,
           email_pref_product   AS product,
           email_pref_security  AS security,
           email_unsubscribed_at AS unsub,
           email_bounced_at      AS bounced
    FROM user WHERE id = ?
  `).get(userId);

  // Hard stops: bounce/unsubscribed → only allow 'security'
  if ((row?.bounced || row?.unsub) && category !== "security") return false;

  if (category === "marketing") return !!row?.marketing;
  if (category === "product") return !!row?.product;
  if (category === "security") return !!row?.security || true; // default allow
  return true;
}

/**
 * Send email via Postmark API
 * @param {Object} args - Email parameters
 * @param {string} args.to - Recipient email
 * @param {string} args.subject - Email subject
 * @param {string} args.html - HTML content
 * @param {string} [args.text] - Plain text content (optional)
 * @param {string} [args.stream="outbound"] - Postmark stream (outbound or broadcast)
 * @param {string} [args.requestId] - Request ID for tracing
 */
async function sendEmail({ to, subject, html, text, stream = "outbound", requestId } = {}) {
  if (!POSTMARK_TOKEN) {
    // Dev fallback: don't throw — log the message so flows can be tested without creds
    console.warn("[mailer] POSTMARK_TOKEN missing — logging email instead:", { to, subject });
    console.warn(html);
    return;
  }

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": POSTMARK_TOKEN,
      "Content-Type": "application/json",
      ...(requestId && { "X-Request-ID": requestId }),
    },
    body: JSON.stringify({
      From: FROM,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text || "",
      MessageStream: stream,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[mailer] Postmark error", res.status, body);
    throw new Error(`Postmark failed ${res.status}`);
  }
}

/**
 * Send email with user preference checks
 * @param {Object} args - Email parameters
 * @param {number} args.userId - User ID for preference checking
 * @param {string} args.to - Recipient email
 * @param {string} args.subject - Email subject
 * @param {string} args.html - HTML content
 * @param {string} [args.text] - Plain text content (optional)
 * @param {string} [args.category="product"] - Email category for preference checking
 * @param {string} [args.stream="outbound"] - Postmark stream (outbound or broadcast)
 * @param {string} [args.requestId] - Request ID for tracing
 */
async function sendUserEmail({ userId, to, subject, html, text, category = "product", stream = "outbound", requestId } = {}) {
  if (!shouldSendEmail(userId, category)) {
    console.warn("[mailer] skipped due to prefs/bounce/unsub", { userId, category, to });
    return { skipped: true };
  }
  return sendEmail({ to, subject, html, text, stream, requestId });
}

module.exports = {
  sendEmail,
  sendUserEmail
};