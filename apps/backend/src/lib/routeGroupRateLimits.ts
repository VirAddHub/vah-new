/**
 * Extra rate limits for sensitive / expensive user actions.
 *
 * These stack with the global `/api` limiter (500/15m per IP) and `/api/auth` (30/15m per IP).
 * Keys are user id when JWT middleware has run; otherwise IP (e.g. 401 spam).
 *
 * Do not use for provider webhooks (`/api/webhooks*`, `/api/webhooks-postmark`, etc.) — those
 * are mounted before the global limiter and/or must not be throttled like browser traffic.
 */
import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

function userOrIpKey(prefix: string) {
  return (req: Request) => {
    const u = req.user?.id;
    return u != null ? `${prefix}:${String(u)}` : ipKeyGenerator(req.ip ?? "");
  };
}

/** POST /api/forwarding/requests and POST /api/requests/bulk — DB + workflow heavy. */
export const forwardingMutationUserLimiter = rateLimit({
  windowMs: FIFTEEN_MIN_MS,
  limit: 35,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey("forwarding-mutation"),
  handler: (_req, res) => {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({
      ok: false,
      error: "rate_limited",
      message: "Too many forwarding requests. Please try again later.",
    });
  },
});

/** POST /api/mail/forward — physical forwarding attempts; tighter than generic API. */
export const physicalMailForwardUserLimiter = rateLimit({
  windowMs: FIFTEEN_MIN_MS,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey("mail-forward"),
  handler: (_req, res) => {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({
      ok: false,
      error: "rate_limited",
      message: "Too many forward attempts. Please try again later.",
    });
  },
});

/** POST /api/kyc/* mutating Sumsub — provider API + cost; GET /status stays on global only. */
export const kycWriteUserLimiter = rateLimit({
  windowMs: FIFTEEN_MIN_MS,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey("kyc-write"),
  handler: (_req, res) => {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({
      ok: false,
      error: "rate_limited",
      message: "Too many verification actions. Please try again later.",
    });
  },
});

/**
 * All /api/gdpr-export/* HTTP calls — complements the 12h job throttle inside POST /export/request
 * and caps status polling + DB work per user.
 */
export const gdprExportHttpUserLimiter = rateLimit({
  windowMs: FIFTEEN_MIN_MS,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey("gdpr-export-http"),
  handler: (_req, res) => {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({
      ok: false,
      error: "rate_limited",
      message: "Too many export requests. Please try again later.",
    });
  },
});
