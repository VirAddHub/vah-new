// apps/backend/src/lib/mailer.ts
import { ENV, emailGuard } from '../env';
import { Templates } from './postmark-templates';
import { modelBuilders, BuildArgs } from './template-models';

// Use CommonJS require for Postmark to avoid import issues
const postmark = require('postmark');

/**
 * Resolves the first name to use in email templates.
 * Single source of truth for name fallback logic.
 * 
 * Priority:
 * 1. firstName (trimmed)
 * 2. name (trimmed)
 * 3. "there" (fallback)
 */
function resolveFirstName(params: {
    firstName?: string | null;
    name?: string | null;
}): string {
    const raw =
        (params.firstName ?? '').trim() ||
        (params.name ?? '').trim();

    return raw || 'there';
}

/**
 * Builds a full URL from APP_BASE_URL and a path.
 * Throws an error if APP_BASE_URL is not set (ensures production always has it configured).
 */
export function buildAppUrl(path: string = '/dashboard'): string {
    const base = ENV.APP_BASE_URL;
    if (!base) {
        throw new Error('APP_BASE_URL is not defined in environment variables. Set it in Render dashboard.');
    }
    // Remove trailing slash from base, ensure path starts with /
    const cleanBase = base.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
}

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
    } catch (error: any) {
        console.error(`Failed to send template email ${opts.templateAlias}:`, error);
        console.error(`Template model sent:`, JSON.stringify(TemplateModel, null, 2));
        console.error(`Postmark error details:`, error?.response?.body || error?.message || error);
        // Graceful fallback - send simple email
        // TemplateModel already has first_name resolved by model builder
        const first_name = TemplateModel.first_name || TemplateModel.name || 'there';
        await client.sendEmail({
            From: ENV.EMAIL_FROM_NAME ? `${ENV.EMAIL_FROM_NAME} <${ENV.EMAIL_FROM}>` : ENV.EMAIL_FROM,
            To: opts.to,
            Subject: 'Notification',
            HtmlBody: `<p>Hi ${first_name},</p><p>You have a new notification.</p>`,
            MessageStream: ENV.POSTMARK_STREAM,
            ReplyTo: ENV.EMAIL_REPLY_TO,
        });
    }
}


// Auth / Security
export async function sendPasswordResetEmail({ email, firstName, name, cta_url }: { email: string; firstName?: string | null; name?: string | null; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SECURITY)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.PasswordReset,
        model: {
            firstName,
            name,
            resetLink: cta_url,
            expiryMinutes: 30,
        },
    });
}

export async function sendPasswordChangedConfirmation({ email, firstName, name }: { email: string; firstName?: string | null; name?: string | null }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SECURITY)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.PasswordChanged,
        model: {
            firstName,
            name,
        },
    });
}

// Welcome & onboarding
export async function sendWelcomeEmail({ email, firstName, name, cta_url }: { email: string; firstName?: string | null; name?: string | null; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_ONBOARDING)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.Welcome,
        model: {
            firstName,
            name,
            dashboardUrl: cta_url,
        },
    });
}

/**
 * Send welcome email with KYC reminder
 * Uses Postmark template alias: welcome-email
 * Template expects: {{first_name}} and {{cta_url}}
 * 
 * Environment variable: POSTMARK_WELCOME_KYC_TEMPLATE_ID is not used (we use template alias instead).
 * The template alias "welcome-email" should be configured in Postmark.
 */
export async function sendWelcomeKycEmail({ email, firstName }: { email: string; firstName: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_ONBOARDING)) return;

    const ctaUrl = buildAppUrl('/dashboard');

    try {
        await sendTemplateEmail({
            to: email,
            templateAlias: Templates.WelcomeKyc,
            model: {
                firstName,
                ctaUrl,
            },
        });
        console.log("[postmark] sent template welcome-email to", email);
    } catch (err: any) {
        console.error("[postmark] failed template welcome-email", err);
        // Don't re-throw - sendTemplateEmail already handles errors gracefully
        // This preserves non-fatal behavior (signup route won't fail if email fails)
    }
}

// Billing & invoices
export async function sendPlanCancelled({ email, firstName, name, end_date, cta_url }: { email: string; firstName?: string | null; name?: string | null; end_date?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.PlanCancelled,
        model: {
            firstName,
            name,
            endDate: end_date,
            billingUrl: cta_url || buildAppUrl('/billing'),
        },
    });
}

export async function sendInvoiceSent({ email, firstName, name, invoice_number, amount, cta_url }: { email: string; firstName?: string | null; name?: string | null; invoice_number?: string; amount?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.InvoiceSent,
        model: {
            firstName,
            name,
            invoiceNumber: invoice_number,
            amount,
            billingUrl: cta_url || buildAppUrl('/billing'),
        },
    });
}

export async function sendPaymentFailed({ email, firstName, name, cta_url }: { email: string; firstName?: string | null; name?: string | null; cta_url: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_BILLING)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.PaymentFailed,
        model: {
            firstName,
            name,
            billingUrl: cta_url,
        },
    });
}

// KYC
export async function sendKycSubmitted({ email, firstName, name, cta_url }: { email: string; firstName?: string | null; name?: string | null; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.KycSubmitted,
        model: {
            firstName,
            name,
            profileUrl: cta_url || buildAppUrl('/profile'),
        },
    });
}

export async function sendKycApproved({ email, firstName, name, cta_url, virtualAddressLine1, virtualAddressLine2, postcode }: { email: string; firstName?: string | null; name?: string | null; cta_url?: string; virtualAddressLine1?: string; virtualAddressLine2?: string; postcode?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.KycApproved,
        model: {
            firstName,
            name,
            dashboardUrl: cta_url || buildAppUrl('/account'),
            virtualAddressLine1,
            virtualAddressLine2,
            postcode,
        },
    });
}

export async function sendKycRejected({ email, firstName, name, reason, cta_url }: { email: string; firstName?: string | null; name?: string | null; reason?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_KYC)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.KycRejected,
        model: {
            firstName,
            name,
            reason,
            profileUrl: cta_url || buildAppUrl('/profile'),
        },
    });
}

// Support
export async function sendSupportRequestReceived({ email, firstName, name, ticket_id, cta_url }: { email: string; firstName?: string | null; name?: string | null; ticket_id?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SUPPORT)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.SupportRequestReceived,
        model: {
            firstName,
            name,
            ticketId: ticket_id,
            ctaUrl: cta_url || buildAppUrl('/support'),
        },
    });
}

export async function sendSupportRequestClosed({ email, firstName, name, ticket_id, cta_url }: { email: string; firstName?: string | null; name?: string | null; ticket_id?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_SUPPORT)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.SupportRequestClosed,
        model: {
            firstName,
            name,
            ticketId: ticket_id,
            ctaUrl: cta_url || buildAppUrl('/support'),
        },
    });
}

// Mail events
export async function sendMailScanned({ email, firstName, name, subject, cta_url }: { email: string; firstName?: string | null; name?: string | null; subject?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) {
        console.warn('[mailer] sendMailScanned skipped: EMAIL_MAIL guard is disabled');
        return;
    }
    console.log('[mailer] Sending mail-scanned email to:', email, 'subject:', subject);
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.MailScanned,
        model: {
            firstName,
            name,
            subjectLine: subject || 'Mail scanned and ready',
            ctaUrl: cta_url || buildAppUrl('/mail'),
        },
    });
    console.log('[mailer] ✅ Mail-scanned email sent successfully to:', email);
}

export async function sendMailForwarded({ email, firstName, name, forwarding_address, forwarded_date }: { email: string; firstName?: string | null; name?: string | null; forwarding_address?: string; forwarded_date?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) return;

    const client = getClient();
    if (!client) return;

    const first_name = resolveFirstName({ firstName, name });

    try {
        // Try the template first
        await sendTemplateEmail({
            to: email,
            templateAlias: Templates.MailForwarded,
            model: {
                firstName,
                name,
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
                <p>Hi ${first_name},</p>
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

export async function sendMailReceivedAfterCancellation({ email, firstName, name, subject, cta_url }: { email: string; firstName?: string | null; name?: string | null; subject?: string; cta_url?: string }): Promise<void> {
    if (!emailGuard(ENV.EMAIL_MAIL)) return;
    await sendTemplateEmail({
        to: email,
        templateAlias: Templates.MailAfterCancellation,
        model: {
            firstName,
            name,
            subjectLine: subject || 'Mail received after cancellation',
            ctaUrl: cta_url || buildAppUrl('/mail'),
        },
    });
}

// Companies House Verification
// Uses Postmark template alias: ch-verification-nudge (update in postmark-templates.ts if different)
export async function sendChVerificationNudge(user: { email: string; first_name?: string | null; name?: string | null }): Promise<void> {
    if (!user.email) return;
    if (!emailGuard(ENV.EMAIL_KYC)) return;

    const ctaUrl = buildAppUrl('/account');

    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.ChVerificationNudge,
        model: {
            firstName: user.first_name,
            name: user.name,
            ctaUrl,
        },
    });
}

// Uses Postmark template alias: ch-verification-reminder
export async function sendChVerificationReminder(user: { email: string; first_name?: string | null; name?: string | null }): Promise<void> {
    if (!user.email) return;
    if (!emailGuard(ENV.EMAIL_KYC)) return;

    const ctaUrl = buildAppUrl('/account');

    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.ChVerificationReminder,
        model: {
            firstName: user.first_name,
            name: user.name,
            ctaUrl,
        },
    });
}