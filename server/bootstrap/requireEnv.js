// server/bootstrap/requireEnv.js
// Environment variable validation for production

const required = [
    'APP_ORIGIN',
    'BACKEND_API_ORIGIN',
    'COOKIE_SECRET',
    'POSTMARK_API_TOKEN',
    'POSTMARK_FROM',
    'GO_CARDLESS_SECRET',
    'SUMSUB_SECRET',
    'COMPANIES_HOUSE_API_KEY',
    'ADDRESS_API_KEY',
    'DATA_DIR',
    'INVOICES_DIR'
];

const optional = [
    'BACKUPS_DIR',
    'INVOICE_LINK_TTL_USER_MIN',
    'INVOICE_LINK_TTL_ADMIN_MIN',
    'NODE_ENV',
    'APP_ENV'
];

function validateEnvironment() {
    if (process.env.NODE_ENV === 'production') {
        const missing = required.filter(k => !process.env[k]);
        if (missing.length) {
            throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
        }

        console.log('[env] Production environment validation passed');
        console.log('[env] Required vars:', required.length);
        console.log('[env] Optional vars:', optional.length);
    } else {
        console.log('[env] Development mode - skipping strict validation');
    }
}

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
};

module.exports = { validateEnvironment, env };
