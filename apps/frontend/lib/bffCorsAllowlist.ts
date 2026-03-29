/**
 * BFF (Next `/api/*`) CORS allowlist for Edge middleware.
 *
 * - Trusted (always): canonical prod + `BFF_CORS_EXTRA_ORIGINS`.
 * - Vercel Preview: this deployment only — `https://${VERCEL_URL}` when `VERCEL_ENV === 'preview'`
 *   (Next uses NODE_ENV=production on previews, so NODE_ENV alone is not enough).
 * - Local / non-production Node: localhost + `BFF_CORS_PREVIEW_ORIGINS` (explicit URLs; no Vercel regex).
 */

function parseCommaOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildTrustedBffOrigins(): Set<string> {
  const s = new Set<string>(['https://virtualaddresshub.co.uk', 'https://www.virtualaddresshub.co.uk']);
  for (const o of parseCommaOrigins(process.env.BFF_CORS_EXTRA_ORIGINS)) {
    s.add(o);
  }
  return s;
}

function buildNonProductionBffOrigins(): Set<string> {
  return new Set<string>([
    'http://localhost:3000',
    'http://localhost:3001',
    ...parseCommaOrigins(process.env.BFF_CORS_PREVIEW_ORIGINS),
  ]);
}

/** Same-origin for the active Vercel preview deployment (one host per deploy, not a pattern). */
function isThisVercelPreviewOrigin(origin: string): boolean {
  if (process.env.VERCEL_ENV !== 'preview') return false;
  const host = process.env.VERCEL_URL?.trim();
  if (!host) return false;
  return origin === `https://${host}`;
}

export function isAllowedBffCorsOrigin(origin: string, isProductionNode: boolean): boolean {
  if (buildTrustedBffOrigins().has(origin)) return true;
  if (isThisVercelPreviewOrigin(origin)) return true;
  if (!isProductionNode) {
    return buildNonProductionBffOrigins().has(origin);
  }
  return false;
}
