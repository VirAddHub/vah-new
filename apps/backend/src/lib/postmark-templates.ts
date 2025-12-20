// apps/backend/src/lib/postmark-templates.ts
export const Templates = {
    // Auth / Security (no sign-in)
    PasswordReset: "password-reset-email", // pragma: allowlist secret
    PasswordChanged: "password-changed-confirmation", // pragma: allowlist secret
    EmailChangeVerification: "mail-change-verification", // pragma: allowlist secret - Template ID: 42716349

    // Welcome & onboarding
    Welcome: "welcome-email", // pragma: allowlist secret
    WelcomeKyc: "welcome-email", // pragma: allowlist secret - Welcome email with KYC reminder

    // Billing & invoices
    PlanCancelled: "plan-cancelled", // pragma: allowlist secret
    PlanPriceChange: "plan-price-change", // pragma: allowlist secret
    InvoiceSent: "invoice-sent", // pragma: allowlist secret
    InvoiceAvailable: "invoice-available", // pragma: allowlist secret - Template ID: 40508791
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
    // Uses Postmark template alias: ch-verification-nudge
    ChVerificationNudge: "ch-verification-nudge", // pragma: allowlist secret
    // Uses Postmark template alias: ch-verification-reminder
    ChVerificationReminder: "ch-verification-reminder", // pragma: allowlist secret

    // Quiz / Marketing
    QuizDay0: "quiz-day0", // pragma: allowlist secret - TODO: Create this template in Postmark
} as const;

export type TemplateKey = keyof typeof Templates;
