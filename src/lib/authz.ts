// src/lib/authz.ts
import type { RequestHandler } from "express";

export const requireAuth: RequestHandler = (req: any, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: "unauthorized" });
    next();
};

export const requireAdmin: RequestHandler = (req: any, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: "unauthorized" });
    if (!req.session.user.is_admin) return res.status(403).json({ error: "forbidden" });
    next();
};
