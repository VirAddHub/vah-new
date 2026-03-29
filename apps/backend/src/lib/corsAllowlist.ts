/**
 * Central CORS origin rules for the Express API.
 *
 * Production: only canonical prod hosts + `CORS_ORIGINS` / `ALLOWED_ORIGINS` (comma-separated).
 * Non-production: production set + localhost + `CORS_PREVIEW_ORIGINS` (explicit preview/staging URLs).
 *
 * Never use broad *.vercel.app regex by default — list preview deployment URLs explicitly.
 */

function parseCommaOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Origins allowed in all environments (production baseline + env extras). */
export function buildTrustedProductionOrigins(): Set<string> {
  const fromEnv = parseCommaOrigins(process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS);
  return new Set<string>([
    'https://virtualaddresshub.co.uk',
    'https://www.virtualaddresshub.co.uk',
    ...fromEnv,
  ]);
}

/** Extra origins allowed only when NODE_ENV !== 'production' (localhost + explicit preview list). */
export function buildNonProductionOnlyOrigins(): Set<string> {
  const preview = parseCommaOrigins(process.env.CORS_PREVIEW_ORIGINS);
  return new Set<string>([
    'http://localhost:3000',
    'http://localhost:3001',
    ...preview,
  ]);
}

export function isCorsOriginAllowed(origin: string | undefined, isProduction: boolean): boolean {
  if (!origin) return true;

  const trusted = buildTrustedProductionOrigins();
  if (trusted.has(origin)) return true;

  if (isProduction) {
    return false;
  }

  return buildNonProductionOnlyOrigins().has(origin);
}
