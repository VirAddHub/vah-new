// apps/backend/src/config/gdpr.ts
// GDPR compliance configuration

/**
 * GDPR Forwarding Window
 * 
 * Mail items older than this number of days cannot be forwarded due to GDPR compliance.
 * This is enforced in:
 * - forwarding.service.ts (createForwardingRequest)
 * - mail-forward.ts (POST /api/mail/forward)
 * - mail.ts (GET /api/mail-items - SQL query)
 * 
 * Note: The check uses "greater than or equal" (>=), so items on day 30 are blocked.
 * Items on day 30 or older are blocked from forwarding but can still be downloaded.
 */
export const GDPR_FORWARDING_WINDOW_DAYS = 30;

/**
 * GDPR Forwarding Window in milliseconds
 * Used for JavaScript date calculations
 */
export const GDPR_FORWARDING_WINDOW_MS = GDPR_FORWARDING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

