/**
 * Legacy Route Adapters
 * 
 * Maps deprecated legacy endpoints to their canonical counterparts.
 * This allows gradual migration while maintaining backward compatibility.
 */

import express from 'express';

export const legacyRouter = express.Router();

// simple deprecation header helper
function setDeprecated(res: express.Response, canonical: string) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', `<${canonical}>; rel="canonical"`);
}

// Legacy /plans → canonical /api/plans
legacyRouter.get('/plans', async (_req, res) => {
    setDeprecated(res, '/api/plans');
    try {
        const plans = [{ id: 'monthly', name: 'Digital Mailbox', price_pence: 999 }];
        return res.status(200).json({ ok: true, data: plans, deprecated: true, canonical: '/api/plans' });
    } catch {
        return res.status(200).json({ ok: true, data: [], deprecated: true, canonical: '/api/plans' });
    }
});

// Export an alias map for logging/metrics (optional)
export const legacyAliasMap = {
    // Auth endpoints
    "/login": { status: "deprecated", aliasOf: "/api/auth/login" },
    "/logout": { status: "deprecated", aliasOf: "/api/auth/logout" },
    "/whoami": { status: "deprecated", aliasOf: "/api/auth/whoami" },
    "/auth/ping": { status: "deprecated", aliasOf: "/api/auth/ping" },

    // Profile endpoints
    "/profile": { status: "deprecated", aliasOf: "/api/profile" },
    "/profile/reset-password-request": { status: "deprecated", aliasOf: "/api/profile/reset-password-request" },
    "/reset-password": { status: "deprecated", aliasOf: "/api/profile/reset-password" },
    "/update-password": { status: "deprecated", aliasOf: "/api/profile/update-password" },

    // Plans endpoints
    "/plans": { status: "deprecated", aliasOf: "/api/plans" },

    // Mail endpoints
    "/mail-items": { status: "deprecated", aliasOf: "/api/mail-items" },
    "/mail-items/:id": { status: "deprecated", aliasOf: "/api/mail-items/:id" },
    "/mail-items/:id/scan-url": { status: "deprecated", aliasOf: "/api/mail-items/:id/scan-url" },
    "/mail-search": { status: "deprecated", aliasOf: "/api/mail-items/search" },

    // Forwarding endpoints
    "/forwarding-requests": { status: "deprecated", aliasOf: "/api/forwarding-requests" },
    "/forwarding-requests/usage": { status: "deprecated", aliasOf: "/api/forwarding-requests/usage" },

    // Billing endpoints
    "/billing": { status: "deprecated", aliasOf: "/api/billing" },
    "/invoices": { status: "deprecated", aliasOf: "/api/invoices" },
    "/invoices/:id": { status: "deprecated", aliasOf: "/api/invoices/:id" },
    "/payments": { status: "deprecated", aliasOf: "/api/payments" },
    "/payments/create-session": { status: "deprecated", aliasOf: "/api/payments/create-session" },

    // Email preferences
    "/email-prefs": { status: "deprecated", aliasOf: "/api/email-prefs" },

    // Support/Tickets
    "/tickets": { status: "deprecated", aliasOf: "/api/tickets" },
    "/support": { status: "deprecated", aliasOf: "/api/support" },

    // KYC endpoints
    "/kyc/start": { status: "deprecated", aliasOf: "/api/kyc/start" },
    "/kyc/status": { status: "deprecated", aliasOf: "/api/kyc/status" },
    "/kyc/upload": { status: "deprecated", aliasOf: "/api/kyc/upload" },

    // Admin endpoints (keep as-is since they're already under /admin/)
    "/admin/users": { status: "deprecated", aliasOf: "/api/admin/users" },
    "/admin/users/:id": { status: "deprecated", aliasOf: "/api/admin/users/:id" },
    "/admin/mail-items": { status: "deprecated", aliasOf: "/api/admin/mail-items" },
    "/admin/forwarding": { status: "deprecated", aliasOf: "/api/admin/forwarding" },
    "/admin/billing": { status: "deprecated", aliasOf: "/api/admin/billing" },
    "/admin/support": { status: "deprecated", aliasOf: "/api/admin/support" },
    "/admin/analytics": { status: "deprecated", aliasOf: "/api/admin/analytics" },

    // Dashboard endpoints
    "/dashboard": { status: "deprecated", aliasOf: "/api/dashboard" },
    "/dashboard/overview": { status: "deprecated", aliasOf: "/api/dashboard/overview" },
    "/dashboard/stats": { status: "deprecated", aliasOf: "/api/dashboard/stats" },

    // Health endpoints (keep as-is)
    "/healthz": { status: "canonical", aliasOf: null },
    "/api/ready": { status: "canonical", aliasOf: null },
    "/api/healthz": { status: "canonical", aliasOf: null },

    // Public endpoints (keep as-is)
    "/scans/:token": { status: "canonical", aliasOf: null },
    "/webhooks-postmark": { status: "canonical", aliasOf: null },
    "/webhooks-gocardless": { status: "canonical", aliasOf: null },
    "/webhooks-sumsub": { status: "canonical", aliasOf: null },
} as const;

/**
 * Get the canonical path for a legacy endpoint
 */
export function getCanonicalPath(legacyPath: string): string | null {
    const alias = legacyAliasMap[legacyPath as keyof typeof legacyAliasMap];
    return alias?.aliasOf || null;
}

/**
 * Check if an endpoint is deprecated
 */
export function isDeprecated(path: string): boolean {
    const alias = legacyAliasMap[path as keyof typeof legacyAliasMap];
    return alias?.status === "deprecated";
}

/**
 * Get all deprecated endpoints
 */
export function getDeprecatedEndpoints(): Array<{ path: string; aliasOf: string }> {
    return Object.entries(legacyAliasMap)
        .filter(([_, alias]) => alias.status === "deprecated")
        .map(([path, alias]) => ({ path, aliasOf: alias.aliasOf! }));
}

/**
 * Legacy adapter middleware that redirects deprecated endpoints
 */
export function legacyAdapter(req: any, res: any, next: any) {
    const path = req.path;
    const canonicalPath = getCanonicalPath(path);

    if (canonicalPath) {
        // Add deprecation warning header
        res.set('X-API-Deprecated', 'true');
        res.set('X-API-Canonical-Path', canonicalPath);
        res.set('X-API-Deprecation-Date', '2025-09-28');

        // Log deprecation warning
        console.warn(`[DEPRECATED] ${req.method} ${path} -> ${canonicalPath}`);

        // Update the request path to the canonical endpoint
        req.url = canonicalPath;
    }

    next();
}

/**
 * CSRF bypass for legacy endpoints that need to work with canonical APIs
 */
export function legacyCsrfBypass(req: any, res: any, next: any) {
    // Skip CSRF for legacy endpoints that are being redirected to canonical APIs
    if (isDeprecated(req.path)) {
        req.skipCsrf = true;
    }
    next();
}
