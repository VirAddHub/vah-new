import fs from "fs";
import type { ConnectionOptions } from "node:tls";

/**
 * PostgreSQL `ssl` option for node `pg` (Next.js / frontend tooling).
 * Mirrors apps/backend/src/lib/pgSslConfig.ts — keep env semantics aligned.
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
