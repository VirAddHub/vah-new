/**
 * Shared rate limiters for payment- and billing-adjacent routes.
 * Keeps Stripe checkout session creation (expensive + provider API) under one per-user bucket
 * whether the client calls /api/stripe-checkout/* or /api/payments/redirect-flows.
 */
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export const stripeCheckoutCreateLimiter = rateLimit({
    windowMs: FIFTEEN_MIN_MS,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const u = (req as { user?: { id?: number } }).user;
        return u?.id != null ? `stripe-checkout-create:${u.id}` : ipKeyGenerator(req.ip ?? "");
    },
    handler: (_req, res) => {
        res.setHeader("Retry-After", "900");
        return res.status(429).json({
            ok: false,
            error: "rate_limited",
            message: "Too many checkout attempts. Please try again later.",
        });
    },
});
