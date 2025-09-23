// app/lib/urls.ts
// URL utilities for frontend - synced from backend

const APP = process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000';
const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
const enc = encodeURIComponent;

if (!APP) console.warn('[urls] NEXT_PUBLIC_APP_ORIGIN is not set');
if (!API) console.warn('[urls] NEXT_PUBLIC_API_BASE is not set');

export function loginDeepLink(nextPathOrHash = '/dashboard') {
    // Supports hashes, e.g. '/billing#invoices'
    return `${APP}/login?next=${enc(nextPathOrHash)}`;
}

export function buildDashboardLink() {
    return `${APP}/dashboard`;
}

export function buildBillingLink() {
    return `${APP}/billing#invoices`;
}

export function buildRestartLink() {
    return `${APP}/restart`;
}

export function buildHelpCentreLink() {
    return `${APP}/help`;
}

export function buildKycLink() {
    return `${APP}/kyc`;
}

export function buildPasswordResetLink(resetToken: string) {
    return `${APP}/reset?token=${enc(resetToken)}`;
}

// One-time, expiring invoice token → served from your app domain via proxy
export function buildInvoiceCta(oneTimeToken: string) {
    // Prefer app-origin to keep cookies/CORS simple:
    return `${APP}/api/invoices/${oneTimeToken}`;
}

// Optional: if you want a generic login→billing deep link
export function buildInvoiceLoginDeepLink() {
    return loginDeepLink('/billing#invoices');
}
