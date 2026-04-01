'use strict';
/**
 * PostgreSQL TLS options for node-pg (CommonJS).
 * Keep in sync with apps/backend/src/lib/pgSslConfig.ts
 *
 * Production: TLS with rejectUnauthorized true by default.
 * DATABASE_SSL_REJECT_UNAUTHORIZED=false disables verification (self-signed DB certs).
 * DATABASE_SSL_INSECURE is ignored in production (stderr warning) — API startup fails if set.
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

function isDatabaseSslRejectUnauthorizedDisabled() {
    const v = String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase();
    return v === 'false' || v === '0';
}

let warnedInsecureIgnoredInProd = false;
let warnedRejectUnauthorizedFalse = false;

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

    const rejectUnauthorized = !isDatabaseSslRejectUnauthorizedDisabled();

    if (!rejectUnauthorized && !warnedRejectUnauthorizedFalse) {
        warnedRejectUnauthorizedFalse = true;
        console.warn(
            '[pgSsl] DATABASE_SSL_REJECT_UNAUTHORIZED=false — PostgreSQL TLS certificate verification is disabled. Prefer DATABASE_SSL_CA with your provider CA bundle in production.'
        );
    }

    return ca ? { rejectUnauthorized, ca } : { rejectUnauthorized };
}

module.exports = {
    getPgSslOption,
    isDatabaseSslInsecureEnvRequested,
    isDatabaseSslRejectUnauthorizedDisabled,
};
