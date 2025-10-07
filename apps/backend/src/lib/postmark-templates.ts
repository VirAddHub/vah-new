// apps/backend/src/lib/postmark-templates.ts
export const Templates = {
    // Auth / Security (no sign-in)
    PasswordReset: "password-reset-email", // pragma: allowlist secret
    PasswordChanged: "password-changed-confirmation", // pragma: allowlist secret

    // Welcome & onboarding
    Welcome: "welcome-email", // pragma: allowlist secret

    // Billing & invoices
    PlanCancelled: "plan-cancelled", // pragma: allowlist secret
    InvoiceSent: "invoice-sent", // pragma: allowlist secret
    PaymentFailed: "payment-failed", // pragma: allowlist secret

    // KYC
    KycSubmitted: "kyc-submitted", // pragma: allowlist secret
    KycApproved: "kyc-approved", // pragma: allowlist secret
    KycRejected: "kyc-rejected", // pragma: allowlist secret

    // Support
    SupportRequestReceived: "support-request-received", // pragma: allowlist secret
    SupportRequestClosed: "support-request-closed", // pragma: allowlist secret

    // Mail events
    MailScanned: "mail-scanned", // pragma: allowlist secret
    MailForwarded: "mail-forwarded", // pragma: allowlist secret
    MailAfterCancellation: "mail-received-after-cancellation", // pragma: allowlist secret
    ForwardingCompleted: "forwarding-completed", // pragma: allowlist secret
} as const;

export type TemplateKey = keyof typeof Templates;
