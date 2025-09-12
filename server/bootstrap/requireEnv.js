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

module.exports = { validateEnvironment };
