// server/utils/urls.js
const APP = process.env.APP_ORIGIN;                  // e.g. https://virtualaddresshub.co.uk
const API = process.env.BACKEND_API_ORIGIN;          // e.g. https://vah-api-staging.onrender.com/api
const enc = encodeURIComponent;

if (!APP) console.warn('[urls] APP_ORIGIN is not set');
if (!API) console.warn('[urls] BACKEND_API_ORIGIN is not set');

function loginDeepLink(nextPathOrHash = '/dashboard') {
    // Supports hashes, e.g. '/billing#invoices'
    return `${APP}/login?next=${enc(nextPathOrHash)}`;
}

function buildDashboardLink() {
    return `${APP}/dashboard`;
}

function buildBillingLink() {
    return `${APP}/billing#invoices`;
}

function buildRestartLink() {
    return `${APP}/restart`;
}

function buildHelpCentreLink() {
    return `${APP}/help`;
}

function buildKycLink() {
    return `${APP}/kyc`;
}

function buildPasswordResetLink(resetToken) {
    return `${APP}/reset?token=${enc(resetToken)}`;
}

// One-time, expiring invoice token → served from your app domain via proxy
function buildInvoiceCta(oneTimeToken) {
    // Prefer app-origin to keep cookies/CORS simple:
    return `${APP}/api/invoices/${oneTimeToken}`;
}

// Optional: if you want a generic login→billing deep link
function buildInvoiceLoginDeepLink() {
    return loginDeepLink('/billing#invoices');
}

module.exports = {
    loginDeepLink,
    buildDashboardLink,
    buildBillingLink,
    buildRestartLink,
    buildHelpCentreLink,
    buildKycLink,
    buildPasswordResetLink,
    buildInvoiceCta,
    buildInvoiceLoginDeepLink
};