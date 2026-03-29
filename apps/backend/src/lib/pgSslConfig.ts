import fs from "fs";
import type { ConnectionOptions } from "node:tls";

/**
 * PostgreSQL `ssl` option for node `pg` Pool / Client.
 * Mirrors apps/backend/scripts/lib/pgSsl.cjs (keep both in sync).
 *
 * - Non-production: `false` (local Postgres usually has no TLS).
 * - Production: TLS with `rejectUnauthorized: true` always. `DATABASE_SSL_INSECURE` is
 *   rejected at API startup (`productionEnvValidation`) and ignored here so scripts cannot
 *   silently disable verification.
 *
 * Environment:
 * - `DATABASE_SSL_CA` — PEM content, or filesystem path to a CA bundle.
 * - `DATABASE_SSL_INSECURE` — when NODE_ENV is not production, SSL is off (`false`) so this flag
 *   has no effect on the client. In production it must be unset (API startup fails if set); if
 *   present while running CLI scripts, it is ignored and a one-time stderr warning is emitted.
 */
export type PgSslOption = false | ConnectionOptions;

/** True when env explicitly requests unverified TLS (never honored when NODE_ENV=production). */
export function isDatabaseSslInsecureEnvRequested(): boolean {
    return (
        process.env.DATABASE_SSL_INSECURE === "1" ||
        String(process.env.DATABASE_SSL_INSECURE || "").toLowerCase() === "true"
    );
}

let warnedInsecureIgnoredInProd = false;

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

    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}
