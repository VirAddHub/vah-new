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

    // Companies House Verification
    // Uses Postmark template alias: ch-verification-nudge (or code-your-own-* if different)
    ChVerificationNudge: "ch-verification-nudge", // pragma: allowlist secret
    // Uses Postmark template alias: code-your-own-5 (update if different)
    ChVerificationReminder: "code-your-own-5", // pragma: allowlist secret

    // Quiz / Marketing
    QuizDay0: "quiz-day0", // pragma: allowlist secret - TODO: Create this template in Postmark
} as const;

export type TemplateKey = keyof typeof Templates;
