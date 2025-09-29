// apps/backend/src/lib/mailer.ts
import { ServerClient } from "postmark";
import { ENV, emailGuard } from "../env";

let client: ServerClient | null = null;
const FROM = ENV.EMAIL_FROM;
const STREAM = "outbound"; // keep consistent with your setup

function getClient() {
  if (!client) {
    client = new ServerClient(ENV.POSTMARK_TOKEN);
  }
  return client;
}

type SendArgs = {
  to: string;
  alias: "billing-reminder" | "kyc-reminder" | "mail-received";
  model: Record<string, unknown>;
  subject?: string;
  tag?: string;
};

async function sendWithTemplate({ to, alias, model, subject, tag }: SendArgs) {
  try {
    return await getClient().sendEmailWithTemplate({
      From: FROM,
      To: to,
      TemplateAlias: alias,          // ✅ use alias, not numeric ID
      TemplateModel: model,
      MessageStream: STREAM,
      Tag: tag,
      ...(subject ? { Subject: subject } : {}),
    });
  } catch (err) {
    // Graceful fallback so first deploys don't explode if template is missing.
    const href =
      (model as any)?.action_url ??
      `${ENV.APP_BASE_URL}`; // generic fallback
    const greeting = (model as any)?.name
      ? `Hi ${(model as any).name},`
      : "Hello,";
    const html = `
      <p>${greeting}</p>
      <p>Please follow this link:</p>
      <p><a href="${href}">${href}</a></p>
    `;
    return getClient().sendEmail({
      From: FROM,
      To: to,
      HtmlBody: html,
      Subject: subject ?? "Notification",
      MessageStream: STREAM,
      Tag: tag,
    });
  }
}

// === Public, guarded helpers ===

export async function sendBillingReminder(args: { email: string; name?: string }) {
  if (!emailGuard(ENV.EMAIL_BILLING)) return;
  return sendWithTemplate({
    to: args.email,
    alias: "billing-reminder",
    model: {
      name: args.name,
      action_url: `${ENV.APP_BASE_URL}/billing#payment`,
    },
    tag: "billing-reminder",
  });
}

export async function sendKycReminder(args: { email: string; name?: string }) {
  if (!emailGuard(ENV.EMAIL_KYC)) return;
  return sendWithTemplate({
    to: args.email,
    alias: "kyc-reminder",
    model: {
      name: args.name,
      action_url: `${ENV.APP_BASE_URL}/profile`,
    },
    tag: "kyc-reminder",
  });
}

export async function sendMailReceived(args: { email: string; name?: string; preview?: string }) {
  if (!emailGuard(ENV.EMAIL_MAIL)) return;
  return sendWithTemplate({
    to: args.email,
    alias: "mail-received",
    model: {
      name: args.name,
      preview: args.preview, // optional snippet for the template
      action_url: `${ENV.APP_BASE_URL}/mail`,
    },
    tag: "mail-received",
  });
}