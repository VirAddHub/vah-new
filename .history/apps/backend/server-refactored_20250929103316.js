// VirtualAddressHub Backend — Refactored with new mailer system
// This is a demonstration of how to refactor the email calls

require('dotenv').config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    override: true,
});

// Import new mailer system
const { sendTemplateEmail } = require('./src/lib/mailer.ts');
const { Templates } = require('./src/lib/postmark-templates.ts');

// ===== REFACTORED EMAIL FUNCTIONS =====

// 1. Password Reset Email
async function sendPasswordResetEmail(user, token) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.PasswordReset,
        model: {
            first_name: user.first_name || '',
            expires_in_hours: 1,
        },
        cta_path: `/reset-password?token=${token}`
    });
}

// 2. Password Changed Confirmation
async function sendPasswordChangedEmail(user) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.PasswordChanged,
        model: {
            first_name: user.first_name || '',
        },
        cta_path: `/profile#security`
    });
}

// 3. Welcome Email
async function sendWelcomeEmail(user) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.Welcome,
        model: {
            first_name: user.first_name || '',
        },
        cta_path: `/dashboard`
    });
}

// 4. Plan Cancelled
async function sendPlanCancelledEmail(user) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.PlanCancelled,
        model: {
            first_name: user.first_name || '',
        },
        cta_path: `/billing#plan`
    });
}

// 5. KYC Submitted
async function sendKycSubmittedEmail(user) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.KycSubmitted,
        model: {
            first_name: user.first_name || '',
        },
        cta_path: `/profile`
    });
}

// 6. Support Request Received
async function sendSupportRequestReceivedEmail(user, ticketId, subject) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.SupportRequestReceived,
        model: {
            first_name: user.first_name || '',
            ticket_id: String(ticketId),
            subject,
        },
        cta_path: `/support`
    });
}

// 7. Support Request Closed
async function sendSupportRequestClosedEmail(user, ticketId) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.SupportRequestClosed,
        model: {
            first_name: user.first_name || '',
            ticket_id: String(ticketId),
        },
        cta_path: `/support`
    });
}

// 8. KYC Approved
async function sendKycApprovedEmail(user, certificateUrl) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.KycApproved,
        model: {
            first_name: user.first_name || '',
            certificate_url: certificateUrl,
        },
        cta_path: `/dashboard`
    });
}

// 9. KYC Rejected
async function sendKycRejectedEmail(user, reason) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.KycRejected,
        model: {
            first_name: user.first_name || '',
            reason: reason || 'Verification was not approved',
        },
        cta_path: `/profile`
    });
}

// 10. Mail After Cancellation
async function sendMailAfterCancellationEmail(user, subject) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.MailAfterCancellation,
        model: {
            first_name: user.first_name || '',
            subject: subject || 'Mail received',
        },
        cta_path: `/billing#plan`
    });
}

// 11. Mail Scanned
async function sendMailScannedEmail(user, subject) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.MailScanned,
        model: {
            first_name: user.first_name || '',
            subject: subject || 'New mail',
        },
        cta_path: `/mail`
    });
}

// 12. Mail Forwarded
async function sendMailForwardedEmail(user, subject, trackingNumber, trackUrl) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.MailForwarded,
        model: {
            first_name: user.first_name || '',
            subject: subject || 'Your mail',
            tracking_number: trackingNumber || '',
            track_url: trackUrl,
        },
        cta_path: `/forwarding`
    });
}

// 13. Invoice Sent
async function sendInvoiceSentEmail(user, invoiceUrl, amount, currency) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.InvoiceSent,
        model: {
            first_name: user.first_name || '',
            invoice_url: invoiceUrl,
            amount: amount ? (amount / 100).toFixed(2) : undefined,
            currency: currency || 'GBP',
        },
        cta_path: `/billing#invoices`
    });
}

// 14. Payment Failed
async function sendPaymentFailedEmail(user) {
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.PaymentFailed,
        model: {
            first_name: user.first_name || '',
        },
        cta_path: `/billing#payment`
    });
}

// ===== EXPORT REFACTORED FUNCTIONS =====
module.exports = {
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    sendWelcomeEmail,
    sendPlanCancelledEmail,
    sendKycSubmittedEmail,
    sendSupportRequestReceivedEmail,
    sendSupportRequestClosedEmail,
    sendKycApprovedEmail,
    sendKycRejectedEmail,
    sendMailAfterCancellationEmail,
    sendMailScannedEmail,
    sendMailForwardedEmail,
    sendInvoiceSentEmail,
    sendPaymentFailedEmail,
};
