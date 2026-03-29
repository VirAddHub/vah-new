/**
 * Production checks for the Next.js app (Edge/Node bootstrap via instrumentation).
 * Does not replace server-side auth — catches obvious client secret exposure and missing BFF config.
 *
 * API overlap: database, JWT, inbound webhooks, DISABLE_RATE_LIMIT, DATABASE_SSL_INSECURE, etc. are
 * validated at backend boot (`apps/backend/src/config/productionEnvValidation.ts`).
 */

function trim(name: string): string {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

function isLocalBackendOrigin(origin: string): boolean {
  const o = origin.toLowerCase();
  return (
    o.startsWith('http://localhost') ||
    o.startsWith('https://localhost') ||
    o.startsWith('http://127.0.0.1') ||
    o.startsWith('https://127.0.0.1')
  );
}

/**
 * Runs when the Next.js runtime loads (see root `instrumentation.ts`).
 * - **Warnings:** console.warn (visible in Vercel/host logs).
 * - **Fatal:** process.exit(1) after logging all fatal lines (unless skip flag set).
 */
export function registerProductionFrontendEnvChecks(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (trim('SKIP_FRONTEND_ENV_VALIDATION') === '1') {
    console.warn(
      '[frontend:env:production] SKIP_FRONTEND_ENV_VALIDATION=1 — startup checks skipped (do not use on public production).'
    );
    return;
  }

  const fatal: string[] = [];
  const warnings: string[] = [];

  if (trim('NEXT_PUBLIC_SELFTEST_SECRET')) {
    warnings.push(
      'NEXT_PUBLIC_SELFTEST_SECRET is exposed to every browser. Use API-only SELFTEST_SECRET on the backend; do not put shared secrets in NEXT_PUBLIC_*.'
    );
  }

  if (trim('NEXT_PUBLIC_REVALIDATE_SECRET')) {
    fatal.push(
      'NEXT_PUBLIC_REVALIDATE_SECRET must not be set — it would expose cache revalidation to every client. Use server-only REVALIDATE_SECRET with POST /api/revalidate (automation) or /api/bff/admin/blog/revalidate (admin UI).'
    );
  }

  if (process.env.NEXT_PUBLIC_DASHBOARD_BOOTSTRAP_DEBUG === '1') {
    warnings.push(
      'NEXT_PUBLIC_DASHBOARD_BOOTSTRAP_DEBUG=1 may log or expose rich dashboard bootstrap data on the client in production.'
    );
  }

  for (const key of Object.keys(process.env)) {
    if (!key.startsWith('NEXT_PUBLIC_')) continue;
    if (!/(SECRET|PASSWORD|PRIVATE_KEY)/i.test(key)) continue;
    if (key === 'NEXT_PUBLIC_SELFTEST_SECRET') continue;
    warnings.push(
      `Review ${key}: name suggests a secret — anything NEXT_PUBLIC_* is shipped to clients.`
    );
  }

  const backend = trim('NEXT_PUBLIC_BACKEND_API_ORIGIN');
  if (!backend) {
    fatal.push(
      'NEXT_PUBLIC_BACKEND_API_ORIGIN is required in production so BFF routes can reach the API.'
    );
  } else {
    const b = backend.toLowerCase();
    if (isLocalBackendOrigin(b)) {
      fatal.push(
        'NEXT_PUBLIC_BACKEND_API_ORIGIN must not point to localhost/127.0.0.1 in production.'
      );
    } else if (b.startsWith('http://')) {
      warnings.push(
        'NEXT_PUBLIC_BACKEND_API_ORIGIN uses http:// — public production should use https:// to avoid mixed content and cookie issues (internal mesh-only deploys may ignore this).'
      );
    }
  }

  for (const w of warnings) {
    console.warn(`[frontend:env:production] ${w}`);
  }

  if (fatal.length > 0) {
    for (const f of fatal) {
      console.error(`[frontend:env:production] FATAL: ${f}`);
    }
    console.error(
      `[frontend:env:production] Validation failed (${fatal.length} fatal issue(s)). Fix env and redeploy.`
    );
    process.exit(1);
  }
}
