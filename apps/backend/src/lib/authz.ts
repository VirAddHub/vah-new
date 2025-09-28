// src/lib/authz.ts
import type { RequestHandler } from "express";

// Public-aware wrapper so any router using requireAuth won't guard public endpoints.
// IMPORTANT: use originalUrl (full mount path), not req.path (router-relative).
const PUBLIC_PATTERNS = [
    /^\/healthz$/,
    /^\/api\/healthz$/,
    /^\/api\/ready$/,
    /^\/api\/auth\/ping$/,
    /^\/api\/plans(?:\/.*)?$/, // GET-only logic happens in the route, but bypass auth here
    /^\/plans$/,               // legacy alias
    /^\/scans\/.*/,            // static/public scans
];

function isPublic(req: any) {
    const raw = (req.originalUrl || req.url || '').split('?')[0];
    return PUBLIC_PATTERNS.some((rx) => rx.test(raw));
}

export const requireAuth: RequestHandler = (req: any, res, next) => {
    if (isPublic(req)) return next();
    if (!req.session?.user) return res.status(401).json({ ok: false, error: "unauthorized" });
    next();
};

export const requireAdmin: RequestHandler = (req: any, res, next) => {
    if (!req.session?.user) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!req.session.user.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    next();
};
