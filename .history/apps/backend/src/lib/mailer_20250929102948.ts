// apps/backend/src/lib/mailer.ts
import fetch from "node-fetch";

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
