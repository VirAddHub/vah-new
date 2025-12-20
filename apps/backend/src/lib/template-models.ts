// apps/backend/src/lib/template-models.ts
import { Templates } from "./postmark-templates";

// shared helpers
const snake = (s: string) =>
  s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, "");

type AnyDict = Record<string, any>;

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

export type BuildArgs = {
  // always useful to have
  firstName?: string | null;     // "John" - preferred field
  name?: string | null;           // Legacy field, used as fallback
  email?: string;
  ctaUrl?: string;        // generic CTA
  dashboardUrl?: string;
  profileUrl?: string;
  billingUrl?: string;
  // specific fields used by certain templates
  resetLink?: string;
  confirmUrl?: string;
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

  // Quiz / Marketing
  score?: number | string;
  segment?: "high" | "mid" | "low";
  bookingUrl?: string;
  booking_url?: string;
  cta_url?: string;
} & AnyDict;

type ModelBuilder = (a: BuildArgs) => AnyDict;

// Shared builder for Welcome and WelcomeKyc (both use "welcome-email" template)
const welcomeEmailBuilder: ModelBuilder = (a) => {
  const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
  const ctaUrl = a.ctaUrl ?? a.cta_url ?? a.dashboardUrl;
  return {
    first_name,
    name: first_name, // backward compatibility
    dashboard_link: ctaUrl,
    cta_url: ctaUrl,
  };
};

// Build modelBuilders object - Welcome and WelcomeKyc both map to "welcome-email"
// so we need to handle the duplicate key programmatically
const _modelBuilders: Record<string, ModelBuilder> = {
  // SECURITY
  [Templates.PasswordReset]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      reset_link: a.resetLink ?? a.ctaUrl,
      expiry_minutes: String(a.expiryMinutes ?? 60),
    };
  },
  [Templates.PasswordChanged]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
    };
  },
  [Templates.EmailChangeVerification]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      confirm_url: a.ctaUrl ?? a.confirmUrl,
      expiry_minutes: String(a.expiryMinutes ?? 30),
    };
  },

  // ONBOARDING
  // Welcome and WelcomeKyc both use "welcome-email" template alias
  [Templates.Welcome]: welcomeEmailBuilder,
  // Note: WelcomeKyc is added programmatically below since it has the same template alias value

  // BILLING
  [Templates.PlanCancelled]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      end_date: a.endDate,            // optional
      cta_url: a.billingUrl ?? a.ctaUrl,
    };
  },
  [Templates.PlanPriceChange]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      plan_name: a.planName,
      old_price: a.oldPrice,
      new_price: a.newPrice,
      interval: a.interval,
      effective_date: a.effectiveDate,
    };
  },
  [Templates.InvoiceSent]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      invoice_number: a.invoiceNumber,
      amount: a.amount,
      cta_url: a.billingUrl ?? a.ctaUrl,
    };
  },
  [Templates.PaymentFailed]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      cta_url: a.billingUrl ?? a.ctaUrl,
    };
  },

  // KYC
  [Templates.KycSubmitted]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      cta_url: a.profileUrl ?? a.ctaUrl,
    };
  },
  [Templates.KycApproved]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      virtual_address_line_1: a.virtualAddressLine1,
      virtual_address_line_2: a.virtualAddressLine2,
      postcode: a.postcode,
      dashboard_link: a.dashboardUrl ?? a.ctaUrl,
    };
  },
  [Templates.KycRejected]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      reason: a.reason ?? "Verification was not approved",
      cta_url: a.profileUrl ?? a.ctaUrl,
    };
  },

  // SUPPORT
  [Templates.SupportRequestReceived]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      ticket_id: a.ticketId,
      cta_url: a.ctaUrl,
    };
  },
  [Templates.SupportRequestClosed]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      ticket_id: a.ticketId,
      cta_url: a.ctaUrl,
    };
  },

  // MAIL
  [Templates.MailScanned]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      subject: a.subjectLine,
      dashboard_link: a.ctaUrl,
    };
  },
  [Templates.MailForwarded]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      forwarding_address: a.forwardingAddress || a.forwarding_address,
      forwarded_date: a.forwardedDate || a.forwarded_date,
    };
  },
  [Templates.MailAfterCancellation]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      subject: a.subjectLine,
      cta_url: a.ctaUrl,
    };
  },

  // COMPANIES HOUSE VERIFICATION
  [Templates.ChVerificationNudge]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      cta_url: a.ctaUrl ?? a.cta_url,
    };
  },
  [Templates.ChVerificationReminder]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      cta_url: a.ctaUrl ?? a.cta_url,
    };
  },

  // QUIZ / MARKETING
  [Templates.QuizDay0]: (a) => {
    const first_name = resolveFirstName({ firstName: a.firstName, name: a.name });
    return {
      first_name,
      name: first_name, // backward compatibility
      score: String(a.score ?? 0),
      segment: a.segment || "low",
      cta_url: a.ctaUrl || a.cta_url,
      booking_url: a.bookingUrl || a.booking_url,
    };
  },
};

// Add WelcomeKyc mapping (same as Welcome since both use "welcome-email")
_modelBuilders[Templates.WelcomeKyc] = welcomeEmailBuilder;

// Export with proper type (both Welcome and WelcomeKyc map to the same template alias)
export const modelBuilders = _modelBuilders as Record<(typeof Templates)[keyof typeof Templates], ModelBuilder>;
