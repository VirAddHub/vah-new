// apps/backend/src/lib/postmark-templates.ts
export const Templates = {
  // Auth / Security (no sign-in)
  PasswordReset: "password-reset-email", // pragma: allowlist secret
  PasswordChanged: "password-changed-confirmation", // pragma: allowlist secret

  // Welcome & onboarding
  Welcome: "welcome-email",

  // Billing & invoices
  PlanCancelled: "plan-cancelled",
  InvoiceSent: "invoice-sent",
  PaymentFailed: "payment-failed",
  BillingReminder: "billing-reminder",

  // KYC
  KycSubmitted: "kyc-submitted",
  KycApproved: "kyc-approved",
  KycRejected: "kyc-rejected",
  KycReminder: "kyc-reminder",

  // Support
  SupportRequestReceived: "support-request-received",
  SupportRequestClosed: "support-request-closed",

  // Mail events
  MailReceived: "mail-received",
  MailScanned: "mail-scanned",
  MailForwarded: "mail-forwarded",
  MailAfterCancellation: "mail-received-after-cancellation",
} as const;

export type TemplateKey = keyof typeof Templates;
