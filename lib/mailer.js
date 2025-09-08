const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN || "";
const FROM = process.env.POSTMARK_FROM || "no-reply@virtualaddresshub.co.uk";

/**
 * Send email via Postmark API
 * @param {Object} args - Email parameters
 * @param {string} args.to - Recipient email
 * @param {string} args.subject - Email subject
 * @param {string} args.html - HTML content
 * @param {string} [args.text] - Plain text content (optional)
 * @param {string} [args.stream="outbound"] - Postmark stream (outbound or broadcast)
 */
async function sendEmail({ to, subject, html, text, stream = "outbound" }) {
  const { default: fetch } = await import("node-fetch");
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

module.exports = {
  sendEmail
};
