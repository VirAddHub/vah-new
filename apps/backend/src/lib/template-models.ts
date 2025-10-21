// apps/backend/src/lib/template-models.ts
import { Templates } from "./postmark-templates";

// shared helpers
const snake = (s: string) =>
  s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, "");

type AnyDict = Record<string, any>;

export type BuildArgs = {
  // always useful to have
  name?: string;          // "John Doe"
  firstName?: string;     // "John"
  email?: string;
  ctaUrl?: string;        // generic CTA
  dashboardUrl?: string;
  profileUrl?: string;
  billingUrl?: string;
  // specific fields used by certain templates
  resetLink?: string;
  expiryMinutes?: number | string;

  invoiceNumber?: string;
  amount?: string;

  ticketId?: string;

  subjectLine?: string;

  trackingNumber?: string;
  carrier?: string;

  virtualAddressLine1?: string;
  virtualAddressLine2?: string;
  postcode?: string;

  forwardingAddress?: string;
  forwarding_address?: string;
  forwardedDate?: string;
  forwarded_date?: string;

  planName?: string;
  oldPrice?: string;
  newPrice?: string;
  interval?: string;
  effectiveDate?: string;

  reason?: string;
} & AnyDict;

type ModelBuilder = (a: BuildArgs) => AnyDict;

export const modelBuilders: Record<(typeof Templates)[keyof typeof Templates], ModelBuilder> = {
  // SECURITY
  [Templates.PasswordReset]: (a) => ({
    name: a.firstName ?? a.name,
    reset_link: a.resetLink ?? a.ctaUrl,
    expiry_minutes: String(a.expiryMinutes ?? 60),
  }),
  [Templates.PasswordChanged]: (a) => ({
    name: a.firstName ?? a.name,
  }),

  // ONBOARDING
  [Templates.Welcome]: (a) => ({
    name: a.firstName ?? a.name,
    dashboard_link: a.dashboardUrl ?? a.ctaUrl,
  }),

  // BILLING
  [Templates.PlanCancelled]: (a) => ({
    name: a.name,
    end_date: a.endDate,            // optional
    cta_url: a.billingUrl ?? a.ctaUrl,
  }),
  [Templates.PlanPriceChange]: (a) => ({
    first_name: a.firstName ?? a.name,
    plan_name: a.planName,
    old_price: a.oldPrice,
    new_price: a.newPrice,
    interval: a.interval,
    effective_date: a.effectiveDate,
  }),
  [Templates.InvoiceSent]: (a) => ({
    name: a.name,
    invoice_number: a.invoiceNumber,
    amount: a.amount,
    cta_url: a.billingUrl ?? a.ctaUrl,
  }),
  [Templates.PaymentFailed]: (a) => ({
    name: a.name,
    cta_url: a.billingUrl ?? a.ctaUrl,
  }),

  // KYC
  [Templates.KycSubmitted]: (a) => ({
    name: a.name,
    cta_url: a.profileUrl ?? a.ctaUrl,
  }),
  [Templates.KycApproved]: (a) => ({
    name: a.firstName ?? a.name,
    virtual_address_line_1: a.virtualAddressLine1,
    virtual_address_line_2: a.virtualAddressLine2,
    postcode: a.postcode,
    dashboard_link: a.dashboardUrl ?? a.ctaUrl,
  }),
  [Templates.KycRejected]: (a) => ({
    name: a.name,
    reason: a.reason ?? "Verification was not approved",
    cta_url: a.profileUrl ?? a.ctaUrl,
  }),

  // SUPPORT
  [Templates.SupportRequestReceived]: (a) => ({
    name: a.name,
    ticket_id: a.ticketId,
    cta_url: a.ctaUrl,
  }),
  [Templates.SupportRequestClosed]: (a) => ({
    name: a.name,
    ticket_id: a.ticketId,
    cta_url: a.ctaUrl,
  }),

  // MAIL
  [Templates.MailScanned]: (a) => ({
    first_name: a.name,
    subject: a.subjectLine,
    dashboard_link: a.ctaUrl,
  }),
  [Templates.MailForwarded]: (a) => ({
    first_name: a.name,
    forwarding_address: a.forwardingAddress || a.forwarding_address,
    forwarded_date: a.forwardedDate || a.forwarded_date,
  }),
  [Templates.MailAfterCancellation]: (a) => ({
    name: a.name,
    subject: a.subjectLine,
    cta_url: a.ctaUrl,
  }),
};
