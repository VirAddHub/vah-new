import type { NextRequest } from 'next/server';

/** Correlation for BFF logs (no cookies, no bodies). */
export function getBffRequestCorrelationId(request: NextRequest): string | undefined {
  const a = request.headers.get('x-request-id')?.trim();
  if (a) return a;
  const b = request.headers.get('x-vercel-id')?.trim();
  return b || undefined;
}

/**
 * Single-line JSON logs for BFF routes: auditable, no response bodies or raw upstream text.
 * Optional `upstreamStatus` / `resourceId` for support correlation (resourceId should be opaque ids only).
 */
export function bffSafeLogError(
  route: string,
  category: string,
  request: NextRequest,
  extra?: Record<string, string | number | boolean | undefined>
): void {
  const requestId = getBffRequestCorrelationId(request);
  console.error(
    JSON.stringify({
      bff: true,
      route,
      category,
      ...(requestId ? { requestId } : {}),
      ...extra,
    })
  );
}
