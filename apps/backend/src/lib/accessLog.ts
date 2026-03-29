import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import type { Logger } from "winston";

/**
 * Safe HTTP access logging helpers.
 *
 * - `safeHttpAccessLog` (server.ts) logs path-only + hasQuery + metadata — never full URLs or ?query.
 * - Use `safeAccessPath(req)` anywhere else request paths are logged (errors, debug) to stay consistent.
 * - Long hex path segments (e.g. export tokens) are replaced with `[redacted]` to avoid leaking signed opaque IDs.
 */

/**
 * Path-only URL: strips ?query and #fragment (tokens often live in ?token= / ?session=).
 */
export function pathWithoutQuery(originalUrl: string | undefined): string {
    if (!originalUrl || typeof originalUrl !== "string") return "";
    const q = originalUrl.indexOf("?");
    const h = originalUrl.indexOf("#");
    const end = q >= 0 && h >= 0 ? Math.min(q, h) : q >= 0 ? q : h >= 0 ? h : originalUrl.length;
    return originalUrl.slice(0, end) || "/";
}

/**
 * Replace long hex-like path segments (e.g. GDPR export tokens) — keeps route shape for debugging.
 */
export function redactOpaquePathSegments(pathname: string): string {
    return pathname.replace(/\/[a-f0-9]{16,}(?=\/|$)/gi, "/[redacted]");
}

export function safeAccessPath(req: Request): string {
    const raw = pathWithoutQuery(req.originalUrl || req.url);
    return redactOpaquePathSegments(raw);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveRequestId(req: Request): string {
    const incoming = req.headers["x-request-id"];
    if (typeof incoming === "string" && UUID_RE.test(incoming.trim())) {
        return incoming.trim();
    }
    return crypto.randomUUID();
}

/**
 * Structured HTTP access log: no full URL, no query string, no Authorization/cookies.
 * Logs on response finish.
 */
export function safeHttpAccessLog(logger: Logger) {
    return (req: Request, res: Response, next: NextFunction) => {
        const requestId = resolveRequestId(req);
        req.headers["x-request-id"] = requestId;
        res.setHeader("X-Request-ID", requestId);

        const start = process.hrtime.bigint();

        res.on("finish", () => {
            const durationNs = process.hrtime.bigint() - start;
            const durationMs = Number(durationNs) / 1e6;

            const cl = res.getHeader("content-length");
            const contentLength =
                typeof cl === "number" ? cl : typeof cl === "string" ? parseInt(cl, 10) : undefined;

            logger.info("http_access", {
                type: "http_access",
                requestId,
                method: req.method,
                path: safeAccessPath(req),
                hasQuery: Boolean(
                    (req.originalUrl && req.originalUrl.includes("?")) || (req.url && req.url.includes("?"))
                ),
                statusCode: res.statusCode,
                durationMs: Math.round(durationMs * 1000) / 1000,
                contentLength: Number.isFinite(contentLength as number) ? contentLength : undefined,
                ip: req.ip || undefined,
            });
        });

        next();
    };
}
