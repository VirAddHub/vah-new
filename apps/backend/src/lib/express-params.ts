import type { Request } from 'express';

/**
 * Get a route param as a string. Express types params as string | string[].
 */
export function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] ?? '' : (v ?? '');
}

/**
 * Get a query param as a string.
 */
export function queryParam(req: Request, key: string): string {
  const v = req.query[key];
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : '';
  return typeof v === 'string' ? v : '';
}
