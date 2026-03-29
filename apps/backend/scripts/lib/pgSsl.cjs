'use strict';
/**
 * PostgreSQL TLS options for node-pg (CommonJS).
 * Keep in sync with apps/backend/src/lib/pgSslConfig.ts
 *
 * Production: always verify server certs (rejectUnauthorized: true). DATABASE_SSL_INSECURE
 * is ignored in production (one-time stderr warning) — API startup fails if it is set.
 * Non-production: no TLS (typical local Postgres).
 *
 * DATABASE_SSL_CA — PEM string or path to CA bundle for custom roots.
 */
const fs = require('fs');

function isDatabaseSslInsecureEnvRequested() {
    return (
        process.env.DATABASE_SSL_INSECURE === '1' ||
        String(process.env.DATABASE_SSL_INSECURE || '').toLowerCase() === 'true'
    );
}

let warnedInsecureIgnoredInProd = false;

function getPgSslOption() {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
        return false;
    }

    if (isDatabaseSslInsecureEnvRequested()) {
        if (!warnedInsecureIgnoredInProd) {
            warnedInsecureIgnoredInProd = true;
            console.error(
                '[pgSsl] DATABASE_SSL_INSECURE is set but is not allowed in production; TLS verification remains enabled. Remove DATABASE_SSL_INSECURE from the environment.'
            );
        }
    }

    const caRaw = process.env.DATABASE_SSL_CA && process.env.DATABASE_SSL_CA.trim();
    let ca;
    if (caRaw) {
        if (caRaw.includes('-----BEGIN')) {
            ca = caRaw;
        } else {
            try {
                if (fs.existsSync(caRaw)) {
                    ca = fs.readFileSync(caRaw, 'utf8');
                }
            } catch (_) {
                /* ignore */
            }
        }
    }

    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

module.exports = { getPgSslOption, isDatabaseSslInsecureEnvRequested };
