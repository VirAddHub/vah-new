// apps/backend/src/lib/mailer.ts
import postmark from 'postmark';
import { ENV, emailGuard } from '../env';
import { Templates } from './postmark-templates';

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
            From: ENV.EMAIL_FROM_NAME ? `${ENV.EMAIL_FROM_NAME} <${ENV.EMAIL_FROM}>` : ENV.EMAIL_FROM,
            To: to,
            TemplateAlias: alias,
            TemplateModel: model,
            MessageStream: ENV.POSTMARK_STREAM,
            ...(ENV.EMAIL_REPLY_TO ? { ReplyTo: ENV.EMAIL_REPLY_TO } : {}),
        });
    } catch {
        // graceful fallback
        await client.sendEmail({
            From: ENV.EMAIL_FROM_NAME ? `${ENV.EMAIL_FROM_NAME} <${ENV.EMAIL_FROM}>` : ENV.EMAIL_FROM,
            To: to,
            Subject: model.subject ?? 'Notification',
            HtmlBody: `<p>${model.greeting ?? 'Hi'},</p><p>${model.body ?? 'Action needed.'}</p><p><a href="${model.action_url}">Open</a></p>`,
            MessageStream: ENV.POSTMARK_STREAM,
            ...(ENV.EMAIL_REPLY_TO ? { ReplyTo: ENV.EMAIL_REPLY_TO } : {}),
        });
    }
}


// Auth / Security
export async function sendPasswordResetEmail({ email, name, cta_url }: { email: string; name?: string; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SECURITY)) return;
    await sendWithTemplate(Templates.PasswordReset, email, {
        name,
        cta_url,
        subject: 'Reset your password',
    });
}

export async function sendPasswordChangedConfirmation({ email, name }: { email: string; name?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SECURITY)) return;
    await sendWithTemplate(Templates.PasswordChanged, email, {
        name,
        subject: 'Password changed successfully',
    });
}

// Welcome & onboarding
export async function sendWelcomeEmail({ email, name, cta_url }: { email: string; name?: string; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_ONBOARDING)) return;
    await sendWithTemplate(Templates.Welcome, email, {
        name,
        cta_url,
        subject: 'Welcome to VirtualAddressHub!',
    });
}

// Billing & invoices
export async function sendPlanCancelled({ email, name, end_date, cta_url }: { email: string; name?: string; end_date?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendWithTemplate(Templates.PlanCancelled, email, {
        name,
        end_date,
        cta_url: cta_url || `${ENV.APP_BASE_URL}/billing`,
        subject: 'Your plan has been cancelled',
    });
}

export async function sendInvoiceSent({ email, name, invoice_number, amount, cta_url }: { email: string; name?: string; invoice_number?: string; amount?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendWithTemplate(Templates.InvoiceSent, email, {
        name,
        invoice_number,
        amount,
        cta_url: cta_url || `${ENV.APP_BASE_URL}/billing`,
        subject: 'Your invoice is ready',
    });
}

export async function sendPaymentFailed({ email, name, cta_url }: { email: string; name?: string; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendWithTemplate(Templates.PaymentFailed, email, {
        name,
        cta_url,
        subject: 'Payment failed - action required',
    });
}

// KYC
export async function sendKycSubmitted({ email, name, cta_url }: { email: string; name?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendWithTemplate(Templates.KycSubmitted, email, {
        name,
        cta_url: cta_url || `${ENV.APP_BASE_URL}/profile`,
        subject: 'KYC documents submitted',
    });
}

export async function sendKycApproved({ email, name, cta_url }: { email: string; name?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendWithTemplate(Templates.KycApproved, email, {
        name,
        cta_url: cta_url || `${ENV.APP_BASE_URL}/profile`,
        subject: 'KYC approved - you\'re all set!',
    });
}

export async function sendKycRejected({ email, name, reason, cta_url }: { email: string; name?: string; reason?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendWithTemplate(Templates.KycRejected, email, {
        name,
        reason,
        cta_url: cta_url || `${ENV.APP_BASE_URL}/profile`,
        subject: 'KYC documents need attention',
    });
}

// Support
export async function sendSupportRequestReceived({ email, name, ticket_id, cta_url }: { email: string; name?: string; ticket_id?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SUPPORT)) return;
    await sendWithTemplate(Templates.SupportRequestReceived, email, {
        name,
        ticket_id,
        cta_url: cta_url || `${ENV.APP_BASE_URL}/support`,
        subject: 'Support request received',
    });
}

export async function sendSupportRequestClosed({ email, name, ticket_id, cta_url }: { email: string; name?: string; ticket_id?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SUPPORT)) return;
    await sendWithTemplate(Templates.SupportRequestClosed, email, {
        name,
        ticket_id,
        cta_url: cta_url || `${ENV.APP_BASE_URL}/support`,
        subject: 'Support request resolved',
    });
}

// Mail events
export async function sendMailScanned({ email, name, subject, cta_url }: { email: string; name?: string; subject?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) return;
    await sendWithTemplate(Templates.MailScanned, email, {
        name,
        subject: subject || 'Mail scanned and ready',
        cta_url: cta_url || `${ENV.APP_BASE_URL}/mail`,
    });
}

export async function sendMailForwarded({ email, name, tracking_number, carrier, cta_url }: { email: string; name?: string; tracking_number?: string; carrier?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) return;
    await sendWithTemplate(Templates.MailForwarded, email, {
        name,
        tracking_number,
        carrier,
        cta_url: cta_url || `${ENV.APP_BASE_URL}/mail`,
        subject: 'Your mail has been forwarded',
    });
}

export async function sendMailReceivedAfterCancellation({ email, name, subject, cta_url }: { email: string; name?: string; subject?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) return;
    await sendWithTemplate(Templates.MailAfterCancellation, email, {
        name,
        subject: subject || 'Mail received after cancellation',
        cta_url: cta_url || `${ENV.APP_BASE_URL}/mail`,
    });
}