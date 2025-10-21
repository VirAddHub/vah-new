// apps/backend/src/lib/postmark-templates.ts
export const Templates = {
    // Auth / Security (no sign-in)
    PasswordReset: "password-reset-email", // pragma: allowlist secret
    PasswordChanged: "password-changed-confirmation", // pragma: allowlist secret

    // Welcome & onboarding
    Welcome: "welcome-email", // pragma: allowlist secret

    // Billing & invoices
    PlanCancelled: "plan-cancelled", // pragma: allowlist secret
    PlanPriceChange: "plan-price-change", // pragma: allowlist secret
    InvoiceSent: "invoice-sent", // pragma: allowlist secret
    PaymentFailed: "payment-failed", // pragma: allowlist secret

    // KYC (simplified - only approved notifications)
    // KycSubmitted: "kyc-submitted", // DISABLED - too noisy
    KycApproved: "kyc-approved", // pragma: allowlist secret - KEEP THIS ONE
    // KycRejected: "kyc-rejected", // DISABLED - users can check dashboard

    // Support
    SupportRequestReceived: "support-request-received", // pragma: allowlist secret
    SupportRequestClosed: "support-request-closed", // pragma: allowlist secret

    // Mail events
    MailScanned: "mail-scanned", // pragma: allowlist secret
    MailForwarded: "mail-forwarded", // pragma: allowlist secret
    MailAfterCancellation: "mail-received-after-cancellation", // pragma: allowlist secret
} as const;

export type TemplateKey = keyof typeof Templates;
