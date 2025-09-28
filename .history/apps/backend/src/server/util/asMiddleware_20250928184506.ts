import type { RequestHandler } from "express";

export function asMiddleware<T extends RequestHandler | undefined>(
  maybe: T,
  name = "middleware"
): RequestHandler {
  if (typeof maybe === "function") return maybe;
  return (_req, _res, next) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[asMiddleware] skipped ${name}`);
    }
    next();
  };
}