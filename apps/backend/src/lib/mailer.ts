// apps/backend/src/lib/mailer.ts
import fetch from "node-fetch";
import { ENV, emailGuard } from "../env";

const {
    POSTMARK_TOKEN,
    POSTMARK_FROM = "hello@virtualaddresshub.co.uk",
    POSTMARK_FROM_NAME = "VirtualAddressHub",
    POSTMARK_STREAM = "outbound",
    POSTMARK_REPLY_TO,
    APP_URL = "https://virtualaddresshub.co.uk",
} = process.env;

function toAbsoluteUrl(cta_path?: string) {
    if (!cta_path) return undefined;
    const base = APP_URL.replace(/\/+$/, "");
    return `${base}${cta_path.startsWith("/") ? "" : "/"}${cta_path}`;
}

export type SendTemplateArgs = {
    to: string;
    templateAlias: string;
    model?: Record<string, any>;
    cta_path?: string;          // "/billing#invoices"
    subjectOverride?: string;
    messageStream?: string;
};

export async function sendTemplateEmail({
    to,
    templateAlias,
    model = {},
    cta_path,
    subjectOverride,
    messageStream = POSTMARK_STREAM,
}: SendTemplateArgs) {
    if (!POSTMARK_TOKEN) throw new Error("POSTMARK_TOKEN is required");

    const TemplateModel = {
        ...model,
        app_url: APP_URL,
        cta_url: toAbsoluteUrl(cta_path),
    };

    const payload = {
        From: POSTMARK_FROM_NAME ? `${POSTMARK_FROM_NAME} <${POSTMARK_FROM}>` : POSTMARK_FROM,
        To: to,
        TemplateAlias: templateAlias,
        TemplateModel,
        MessageStream: messageStream,
        ...(POSTMARK_REPLY_TO ? { ReplyTo: POSTMARK_REPLY_TO } : {}),
        ...(subjectOverride ? { Subject: subjectOverride } : {}),
    };

    const r = await fetch("https://api.postmarkapp.com/email/withTemplate", {
        method: "POST",
        headers: {
            "X-Postmark-Server-Token": POSTMARK_TOKEN,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!r.ok) {
        const body = await r.text().catch(() => "");
        throw new Error(`[postmark] ${r.status} ${r.statusText} :: ${body}`);
    }
    return r.json();
}

// Guarded email functions for transactional emails
type Recipient = { email: string; name?: string };

const cta = (label: string, href: string) =>
  `<a href="${href}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-weight:600">${label}</a>`;

const wrap = (title: string, body: string) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#111">
    <h2 style="margin:0 0 12px 0">${title}</h2>
    <div>${body}</div>
    <p style="margin-top:24px;font-size:12px;color:#666">If the button doesn't work, copy & paste the link into your browser.</p>
  </div>
`;

export async function sendBillingReminder(recipient: Recipient) {
  if (!emailGuard(ENV.EMAIL_BILLING)) return; // feature flag off → no-op
  const href = `${ENV.APP_BASE_URL}/billing#payment`;
  const html = wrap(
    "Payment needed",
    `<p>Hi${recipient.name ? ` ${recipient.name}` : ""}, your payment is due.</p>
     <p>${cta("Review & pay", href)}</p>
     <p>${href}</p>`
  );
  await sendTemplateEmail({
    to: recipient.email,
    templateAlias: "billing-reminder",
    model: { html },
    cta_path: "/billing#payment",
    subjectOverride: "Action required: complete your payment",
  });
}

export async function sendKycReminder(recipient: Recipient) {
  if (!emailGuard(ENV.EMAIL_KYC)) return;
  const href = `${ENV.APP_BASE_URL}/profile`;
  const html = wrap(
    "Verify your identity",
    `<p>Hi${recipient.name ? ` ${recipient.name}` : ""}, please complete your KYC.</p>
     <p>${cta("Go to profile", href)}</p>
     <p>${href}</p>`
  );
  await sendTemplateEmail({
    to: recipient.email,
    templateAlias: "kyc-reminder",
    model: { html },
    cta_path: "/profile",
    subjectOverride: "Please complete KYC",
  });
}

export async function sendMailReceived(recipient: Recipient, opts?: { preview?: string }) {
  if (!emailGuard(ENV.EMAIL_MAIL)) return;
  const href = `${ENV.APP_BASE_URL}/mail`;
  const html = wrap(
    "You've got new mail",
    `<p>Hi${recipient.name ? ` ${recipient.name}` : ""}, a new message just arrived.${opts?.preview ? `</p><blockquote style="margin:8px 0;padding-left:12px;border-left:3px solid #ddd;color:#555">${opts.preview}</blockquote><p>` : ""}</p>
     <p>${cta("Open inbox", href)}</p>
     <p>${href}</p>`
  );
  await sendTemplateEmail({
    to: recipient.email,
    templateAlias: "mail-received",
    model: { html },
    cta_path: "/mail",
    subjectOverride: "New message received",
  });
}
