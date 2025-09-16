// server/bootstrap/requireEnv.js
// Environment variable validation for production

const isProd = process.env.NODE_ENV === 'production';

// feature flags (visible UI, but backend can be off until you flip these)
const BILLING_ENABLED = process.env.BILLING_ENABLED === '1';
const KYC_ENABLED = process.env.KYC_ENABLED === '1';

// Try to infer public origin on Render if not provided
const inferredOrigin =
    process.env.BACKEND_API_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL || // Render sets this
    '';

const baseRequired = [
    'COOKIE_SECRET',
    'DATA_DIR',
];

const dynamicRequired = [];
if (!inferredOrigin) dynamicRequired.push('BACKEND_API_ORIGIN'); // only require if not inferred

if (BILLING_ENABLED) {
    dynamicRequired.push('INVOICES_DIR');
    dynamicRequired.push('POSTMARK_API_TOKEN', 'GO_CARDLESS_SECRET');
}
if (KYC_ENABLED) {
    dynamicRequired.push('SUMSUB_SECRET');
}

const missing = [...baseRequired, ...dynamicRequired].filter(k => !process.env[k]);

function validateEnvironment() {
    if (isProd) {
        if (missing.length) {
            throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
        }

        console.log('[env] Production environment validation passed');
        console.log('[env] Base required vars:', baseRequired.length);
        console.log('[env] Dynamic required vars:', dynamicRequired.length);
        console.log('[env] Billing enabled:', BILLING_ENABLED);
        console.log('[env] KYC enabled:', KYC_ENABLED);
    } else {
        console.log('[env] Development mode - skipping strict validation');
    }
}

// expose resolved origin for the app
process.env.BACKEND_API_ORIGIN = inferredOrigin || process.env.BACKEND_API_ORIGIN || '';

// Create env object with validated values
const env = {
    DATA_DIR: process.env.DATA_DIR || './dist/data',
    INVOICES_DIR: process.env.INVOICES_DIR || './dist/data/invoices',
    BACKUPS_DIR: process.env.BACKUPS_DIR || './dist/data/backups',
    APP_ORIGIN: process.env.APP_ORIGIN,
    BACKEND_API_ORIGIN: process.env.BACKEND_API_ORIGIN,
    COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev-cookie-secret-please-change',
    POSTMARK_API_TOKEN: process.env.POSTMARK_API_TOKEN,
    POSTMARK_FROM: process.env.POSTMARK_FROM,
    GO_CARDLESS_SECRET: process.env.GO_CARDLESS_SECRET,
    SUMSUB_SECRET: process.env.SUMSUB_SECRET,
    COMPANIES_HOUSE_API_KEY: process.env.COMPANIES_HOUSE_API_KEY,
    ADDRESS_API_KEY: process.env.ADDRESS_API_KEY,
    INVOICE_LINK_TTL_USER_MIN: parseInt(process.env.INVOICE_LINK_TTL_USER_MIN || '30'),
    INVOICE_LINK_TTL_ADMIN_MIN: parseInt(process.env.INVOICE_LINK_TTL_ADMIN_MIN || '60'),
    BILLING_ENABLED,
    KYC_ENABLED
};

module.exports = { validateEnvironment, env };
