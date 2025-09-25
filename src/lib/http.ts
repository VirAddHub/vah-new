// src/lib/http.ts
import type { RequestHandler } from "express";

export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res: any, data: any = {}) => res.status(200).json(data);
export const created = (res: any, data: any = {}) => res.status(201).json(data);
export const noContent = (res: any) => res.status(204).send();

export const notFound = (res: any, message = "Not found") =>
  res.status(404).json({ error: "not_found", message });

export const badRequest = (res: any, message = "Bad request") =>
  res.status(400).json({ error: "bad_request", message });

export const forbidden = (res: any, message = "Forbidden") =>
  res.status(403).json({ error: "forbidden", message });

export const listResult = <T>(rows: T[] | null | undefined) => ({ items: rows ?? [] });
