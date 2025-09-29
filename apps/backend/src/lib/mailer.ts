// apps/backend/src/lib/mailer.ts
import postmark from 'postmark';
import { ENV, emailGuard } from '../env';

let _client: postmark.ServerClient | null = null;
function getClient() {
  if (!_client) {
    if (!ENV.POSTMARK_TOKEN) return null; // no-op in local/test if unset
    _client = new postmark.ServerClient(ENV.POSTMARK_TOKEN);
  }
  return _client;
}

async function sendWithTemplate(alias: string, to: string, model: Record<string, any>) {
  const client = getClient();
  if (!client) return; // silently skip when not configured (tests/local)
  try {
    await client.sendEmailWithTemplate({
      From: ENV.EMAIL_FROM,
      To: to,
      TemplateAlias: alias,
      TemplateModel: model,
      MessageStream: 'outbound',
    });
  } catch {
    // graceful fallback
    await client.sendEmail({
      From: ENV.EMAIL_FROM,
      To: to,
      Subject: model.subject ?? 'Notification',
      HtmlBody: `<p>${model.greeting ?? 'Hi'},</p><p>${model.body ?? 'Action needed.'}</p><p><a href="${model.action_url}">Open</a></p>`,
      MessageStream: 'outbound',
    });
  }
}

export async function sendBillingReminder({ email, name }: { email: string; name?: string }) {
  if (!emailGuard(ENV.EMAIL_BILLING)) return;
  await sendWithTemplate('billing-reminder', email, {
    name,
    subject: 'Complete your payment',
    action_url: `${ENV.APP_BASE_URL}/billing#payment`,
  });
}

export async function sendKycReminder({ email, name }: { email: string; name?: string }) {
  if (!emailGuard(ENV.EMAIL_KYC)) return;
  await sendWithTemplate('kyc-reminder', email, {
    name,
    subject: 'Verify your identity',
    action_url: `${ENV.APP_BASE_URL}/profile`,
  });
}

export async function sendMailReceived({
  email, name, preview,
}: { email: string; name?: string; preview?: string }) {
  if (!emailGuard(ENV.EMAIL_MAIL)) return;
  await sendWithTemplate('mail-received', email, {
    name,
    subject: 'You have got mail',
    preview,
    action_url: `${ENV.APP_BASE_URL}/mail`,
  });
}