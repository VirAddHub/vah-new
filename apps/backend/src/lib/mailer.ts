// apps/backend/src/lib/mailer.ts
import { ENV, emailGuard } from '../env';
import { Templates } from './postmark-templates';
import { modelBuilders, BuildArgs } from './template-models';

// Use CommonJS require for Postmark to avoid import issues
const postmark = require('postmark');

let _client: any | null = null;
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

// New standardized template email function
export async function sendTemplateEmail(opts: {
    to: string;
    templateAlias: (typeof Templates)[keyof typeof Templates];
    model: BuildArgs;
}) {
    if (!ENV.POSTMARK_TOKEN) return;

    const client = getClient();
    if (!client) return;

    const build = modelBuilders[opts.templateAlias];
    const TemplateModel = build ? build(opts.model) : opts.model;

    try {
        await client.sendEmailWithTemplate({
            From: ENV.EMAIL_FROM_NAME ? `${ENV.EMAIL_FROM_NAME} <${ENV.EMAIL_FROM}>` : ENV.EMAIL_FROM,
            To: opts.to,
            TemplateAlias: opts.templateAlias,
            TemplateModel,
            ReplyTo: ENV.EMAIL_REPLY_TO,
            MessageStream: ENV.POSTMARK_STREAM,
        });
    } catch (error) {
        console.error(`Failed to send template email ${opts.templateAlias}:`, error);
        // Graceful fallback - send simple email
        await client.sendEmail({
            From: ENV.EMAIL_FROM_NAME ? `${ENV.EMAIL_FROM_NAME} <${ENV.EMAIL_FROM}>` : ENV.EMAIL_FROM,
            To: opts.to,
            Subject: 'Notification',
            HtmlBody: `<p>Hi ${opts.model.name || 'there'},</p><p>You have a new notification.</p>`,
            MessageStream: ENV.POSTMARK_STREAM,
            ReplyTo: ENV.EMAIL_REPLY_TO,
        });
    }
}


// Auth / Security
export async function sendPasswordResetEmail({ email, name, cta_url }: { email: string; name?: string; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SECURITY)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.PasswordReset,
        model: {
            firstName: name,
            resetLink: cta_url,
            expiryMinutes: 30,
        },
    });
}

export async function sendPasswordChangedConfirmation({ email, name }: { email: string; name?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SECURITY)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.PasswordChanged,
        model: {
            firstName: name,
        },
    });
}

// Welcome & onboarding
export async function sendWelcomeEmail({ email, name, cta_url }: { email: string; name?: string; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_ONBOARDING)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.Welcome,
        model: {
            firstName: name,
            dashboardUrl: cta_url,
        },
    });
}

// Billing & invoices
export async function sendPlanCancelled({ email, name, end_date, cta_url }: { email: string; name?: string; end_date?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.PlanCancelled,
        model: {
            name,
            endDate: end_date,
            billingUrl: cta_url || `${ENV.APP_BASE_URL}/billing`,
        },
    });
}

export async function sendInvoiceSent({ email, name, invoice_number, amount, cta_url }: { email: string; name?: string; invoice_number?: string; amount?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.InvoiceSent,
        model: {
            name,
            invoiceNumber: invoice_number,
            amount,
            billingUrl: cta_url || `${ENV.APP_BASE_URL}/billing`,
        },
    });
}

export async function sendPaymentFailed({ email, name, cta_url }: { email: string; name?: string; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.PaymentFailed,
        model: {
            name,
            billingUrl: cta_url,
        },
    });
}

// KYC
export async function sendKycSubmitted({ email, name, cta_url }: { email: string; name?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.KycSubmitted,
        model: {
            name,
            profileUrl: cta_url || `${ENV.APP_BASE_URL}/profile`,
        },
    });
}

export async function sendKycApproved({ email, name, cta_url, virtualAddressLine1, virtualAddressLine2, postcode }: { email: string; name?: string; cta_url?: string; virtualAddressLine1?: string; virtualAddressLine2?: string; postcode?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.KycApproved,
        model: {
            firstName: name,
            dashboardUrl: cta_url || `${ENV.APP_BASE_URL}/profile`,
            virtualAddressLine1,
            virtualAddressLine2,
            postcode,
        },
    });
}

export async function sendKycRejected({ email, name, reason, cta_url }: { email: string; name?: string; reason?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.KycRejected,
        model: {
            name,
            reason,
            profileUrl: cta_url || `${ENV.APP_BASE_URL}/profile`,
        },
    });
}

// Support
export async function sendSupportRequestReceived({ email, name, ticket_id, cta_url }: { email: string; name?: string; ticket_id?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SUPPORT)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.SupportRequestReceived,
        model: {
            name,
            ticketId: ticket_id,
            ctaUrl: cta_url || `${ENV.APP_BASE_URL}/support`,
        },
    });
}

export async function sendSupportRequestClosed({ email, name, ticket_id, cta_url }: { email: string; name?: string; ticket_id?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SUPPORT)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.SupportRequestClosed,
        model: {
            name,
            ticketId: ticket_id,
            ctaUrl: cta_url || `${ENV.APP_BASE_URL}/support`,
        },
    });
}

// Mail events
export async function sendMailScanned({ email, name, subject, cta_url }: { email: string; name?: string; subject?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.MailScanned,
        model: {
            name,
            subjectLine: subject || 'Mail scanned and ready',
            ctaUrl: cta_url || `${ENV.APP_BASE_URL}/mail`,
        },
    });
}

export async function sendMailForwarded({ email, name, forwarding_address, forwarded_date }: { email: string; name?: string; forwarding_address?: string; forwarded_date?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) return;

    const client = getClient();
    if (!client) return;

    try {
        // Try the template first
        await sendTemplateEmail({
            to: email,
            templateAlias: Templates.MailForwarded,
            model: {
                name: name,
                forwarding_address: forwarding_address || 'Your forwarding address',
                forwarded_date: forwarded_date || new Date().toLocaleDateString('en-GB'),
            },
        });
    } catch (error) {
        console.error('ForwardingCompleted template failed, sending fallback email:', error);

        // Send a proper fallback email instead of generic notification
        await client.sendEmail({
            From: ENV.EMAIL_FROM_NAME ? `${ENV.EMAIL_FROM_NAME} <${ENV.EMAIL_FROM}>` : ENV.EMAIL_FROM,
            To: email,
            Subject: 'Mail Forwarded Successfully',
            HtmlBody: `
                <p>Hi ${name || 'there'},</p>
                <p>Your mail has been successfully forwarded!</p>
                <p><strong>Forwarding Address:</strong> ${forwarding_address || 'Your forwarding address'}</p>
                <p><strong>Forwarded Date:</strong> ${forwarded_date || new Date().toLocaleDateString('en-GB')}</p>
                <p>Thank you for using VirtualAddressHub!</p>
            `,
            MessageStream: ENV.POSTMARK_STREAM,
            ReplyTo: ENV.EMAIL_REPLY_TO,
        });
    }
}

export async function sendMailReceivedAfterCancellation({ email, name, subject, cta_url }: { email: string; name?: string; subject?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.MailAfterCancellation,
        model: {
            name,
            subjectLine: subject || 'Mail received after cancellation',
            ctaUrl: cta_url || `${ENV.APP_BASE_URL}/mail`,
        },
    });
}