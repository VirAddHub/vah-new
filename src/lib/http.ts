// src/lib/http.ts
import type { RequestHandler } from "express";

export const asyncHandler = (fn: RequestHandler): RequestHandler =>
    (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Standard response format: { ok: true/false, data/error }
export const ok = (res: any, data: any = {}) => res.status(200).json({ ok: true, data });
export const created = (res: any, data: any = {}) => res.status(201).json({ ok: true, data });
export const noContent = (res: any) => res.status(204).send();

export const notFound = (res: any, message = "Not found") =>
    res.status(404).json({ ok: false, error: "not_found", message });

export const badRequest = (res: any, message = "Bad request") =>
    res.status(400).json({ ok: false, error: "bad_request", message });

export const forbidden = (res: any, message = "Forbidden") =>
    res.status(403).json({ ok: false, error: "forbidden", message });

export const unauthorized = (res: any, message = "Unauthorized") =>
    res.status(401).json({ ok: false, error: "unauthorized", message });

export const serverError = (res: any, message = "Internal server error") =>
    res.status(500).json({ ok: false, error: "server_error", message });

export const listResult = <T>(rows: T[] | null | undefined) => ({ items: rows ?? [] });
