// server/mailer-templates.js
const { send } = require('./mailer');

// Note: Add this line to welcome and kyc-approved email templates in Postmark:
// "Tip: We forward letters from HMRC and Companies House free — just request forwarding from your dashboard."
const {
    buildDashboardLink,
    buildBillingLink,
    buildRestartLink,
    buildHelpCentreLink,
    buildKycLink,
    buildPasswordResetLink,
    buildInvoiceCta
} = require('./utils/urls');

// Helpers
const fmtDateUK = (msOrDate) =>
    new Date(msOrDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * 1) Invoice Sent
 * Template vars you provided: first_name, invoice_amount, billing_period, invoice_link
 */
async function emailInvoiceSent({ to, first_name, amountPennies, periodStart, periodEnd, oneTimeToken }) {
    return send('invoice-ready', to, {
        first_name: first_name || 'there',
        invoice_amount: (amountPennies / 100).toFixed(2),
        billing_period: `${fmtDateUK(periodStart)} – ${fmtDateUK(periodEnd)}`,
        invoice_link: buildInvoiceCta(oneTimeToken)
    });
}

/**
 * 2) Account Closed & Data Removed
 * Vars: first_name, restart_link
 */
async function emailAccountClosed({ to, first_name }) {
    return send('account-closed', to, {
        first_name,
        restart_link: buildRestartLink()
    });
}

/**
 * 3) KYC Approved
 * Vars: first_name, virtual_address_line_1, virtual_address_line_2, postcode, dashboard_link
 */
async function emailKycApproved({ to, first_name, va1, va2, postcode }) {
    return send('kyc-approved', to, {
        first_name,
        virtual_address_line_1: va1,
        virtual_address_line_2: va2,
        postcode,
        dashboard_link: buildDashboardLink()
    });
}

/**
 * 4) KYC Rejected
 * Vars: first_name, kyc_link
 */
async function emailKycRejected({ to, first_name }) {
    return send('kyc-rejected', to, {
        first_name,
        kyc_link: buildKycLink()
    });
}

/**
 * 5) KYC Submitted
 * Vars: first_name, dashboard_link
 */
async function emailKycSubmitted({ to, first_name }) {
    return send('kyc-submitted', to, {
        first_name,
        dashboard_link: buildDashboardLink()
    });
}

/**
 * 6) Mail Forwarded
 * Vars: first_name, forwarding_address, forwarded_date
 */
async function emailMailForwarded({ to, first_name, forwarding_address, forwarded_at }) {
    return send('mail-forwarded', to, {
        first_name,
        forwarding_address,
        forwarded_date: fmtDateUK(forwarded_at)
    });
}

/**
 * 7) Mail Received After Cancellation
 * Vars: first_name, restart_link
 */
async function emailMailReceivedAfterCancel({ to, first_name }) {
    return send('mail-after-cancel', to, {
        first_name,
        restart_link: buildRestartLink()
    });
}

/**
 * 8) Mail Scanned
 * Vars: first_name, dashboard_link
 */
async function emailMailScanned({ to, first_name }) {
    return send('mail-scanned', to, {
        first_name,
        dashboard_link: buildDashboardLink()
    });
}

/**
 * 9) Password Changed Confirmation
 * Vars: first_name, reset_link
 * (reset_link optional but useful if they didn't do it)
 */
async function emailPasswordChanged({ to, first_name, resetToken }) {
    return send('password-changed', to, {
        first_name,
        reset_link: resetToken ? buildPasswordResetLink(resetToken) : buildPasswordResetLink('request') // optional
    });
}

/**
 * 10) Payment Failed
 * Vars: first_name, billing_link
 */
async function emailPaymentFailed({ to, first_name }) {
    return send('payment-failed', to, {
        first_name,
        billing_link: buildBillingLink()
    });
}

/**
 * 11) Plan Cancelled
 * Vars: first_name, end_date, restart_link
 */
async function emailPlanCancelled({ to, first_name, end_at }) {
    return send('plan-cancelled', to, {
        first_name,
        end_date: fmtDateUK(end_at),
        restart_link: buildRestartLink()
    });
}

/**
 * 12) Support Request Closed
 * Vars: first_name
 */
async function emailSupportClosed({ to, first_name }) {
    return send('ticket-closed', to, { first_name });
}

/**
 * 13) Support Request Received
 * Vars: first_name, help_centre_link
 */
async function emailSupportReceived({ to, first_name }) {
    return send('ticket-received', to, {
        first_name,
        help_centre_link: buildHelpCentreLink()
    });
}

module.exports = {
    emailInvoiceSent,
    emailAccountClosed,
    emailKycApproved,
    emailKycRejected,
    emailKycSubmitted,
    emailMailForwarded,
    emailMailReceivedAfterCancel,
    emailMailScanned,
    emailPasswordChanged,
    emailPaymentFailed,
    emailPlanCancelled,
    emailSupportClosed,
    emailSupportReceived
};
