import fs from "fs";
import type { ConnectionOptions } from "node:tls";

/**
 * PostgreSQL `ssl` option for node `pg` Pool / Client.
 * Mirrors apps/backend/scripts/lib/pgSsl.cjs (keep both in sync).
 *
 * - Non-production: `false` (local Postgres usually has no TLS).
 * - Production: TLS with `rejectUnauthorized: true` by default.
 *
 * Environment:
 * - `DATABASE_SSL_CA` — PEM content, or filesystem path to a CA bundle (preferred for private CAs).
 * - `DATABASE_SSL_REJECT_UNAUTHORIZED` — set to `false` or `0` to allow self-signed / mismatched
 *   server certs (mitigates DEPTH_ZERO_SELF_SIGNED_CERT). Emits a startup warning in production;
 *   prefer fixing trust via `DATABASE_SSL_CA` when possible.
 * - `DATABASE_SSL_INSECURE` — legacy alias for “disable verify”; must not be set in production
 *   (startup fails in `productionEnvValidation`).
 */
export type PgSslOption = false | ConnectionOptions;

/** True when env explicitly requests unverified TLS (never honored when NODE_ENV=production). */
export function isDatabaseSslInsecureEnvRequested(): boolean {
    return (
        process.env.DATABASE_SSL_INSECURE === "1" ||
        String(process.env.DATABASE_SSL_INSECURE || "").toLowerCase() === "true"
    );
}

/** True when `DATABASE_SSL_REJECT_UNAUTHORIZED` is explicitly `false` or `0` (skip TLS cert verification). */
export function isDatabaseSslRejectUnauthorizedDisabled(): boolean {
    const v = String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "").trim().toLowerCase();
    return v === "false" || v === "0";
}

let warnedInsecureIgnoredInProd = false;
let warnedRejectUnauthorizedFalse = false;

export function getPgSslOption(): PgSslOption {
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
        return false;
    }

    if (isDatabaseSslInsecureEnvRequested()) {
        if (!warnedInsecureIgnoredInProd) {
            warnedInsecureIgnoredInProd = true;
            console.error(
                "[pgSsl] DATABASE_SSL_INSECURE is set but is not allowed in production; TLS verification remains enabled. Remove DATABASE_SSL_INSECURE from the environment."
            );
        }
    }

    const caRaw = process.env.DATABASE_SSL_CA?.trim();
    let ca: string | undefined;
    if (caRaw) {
        if (caRaw.includes("-----BEGIN")) {
            ca = caRaw;
        } else {
            try {
                if (fs.existsSync(caRaw)) {
                    ca = fs.readFileSync(caRaw, "utf8");
                }
            } catch {
                /* ignore missing path */
            }
        }
    }

    const rejectUnauthorized = !isDatabaseSslRejectUnauthorizedDisabled();

    if (!rejectUnauthorized && !warnedRejectUnauthorizedFalse) {
        warnedRejectUnauthorizedFalse = true;
        console.warn(
            "[pgSsl] DATABASE_SSL_REJECT_UNAUTHORIZED=false — PostgreSQL TLS certificate verification is disabled. Prefer DATABASE_SSL_CA with your provider's CA bundle in production."
        );
    }

    return ca ? { rejectUnauthorized, ca } : { rejectUnauthorized };
}
