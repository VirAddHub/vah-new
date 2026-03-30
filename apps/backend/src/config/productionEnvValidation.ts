/**
 * Production-only environment validation (explicit checks, no magic).
 *
 * Run once at API startup. Fails fast on issues that would leave prod unsafe or broken;
 * warns on degraded but non-fatal configuration.
 *
 * Next.js overlap: browser-facing checks live in `apps/frontend/lib/server/productionFrontendEnv.ts`
 * (instrumentation). Keep COOKIE_SECURE / FORCE_SECURE_COOKIES aligned with `lib/cookies.ts` on both sides.
 */

import { isStripeEnabled, getStripeConfig, getBillingProvider } from './billing';
import {
  isSumsubApiConfigured,
  resolveSumsubApiConfig,
  resolveSumsubWebhookSecret,
} from '../lib/sumsubConfig';
import { logger } from '../lib/logger';
import { isDatabaseSslInsecureEnvRequested } from '../lib/pgSslConfig';

const WEAK_JWT_SECRETS = new Set(
  [
    'secret',
    'password',
    'changeme',
    'test',
    'testing',
    'testing-secret',
    'jwt_secret',
    'your-secret',
    'your-secret-key',
    'dev',
    'development',
  ].map((s) => s.toLowerCase())
);

export type ProductionEnvCheckResult = {
  fatal: string[];
  warnings: string[];
};

function trim(name: string): string {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Collect issues. Safe to call in any NODE_ENV (returns empty outside production).
 */
export function collectProductionEnvIssues(): ProductionEnvCheckResult {
  const fatal: string[] = [];
  const warnings: string[] = [];

  if (process.env.NODE_ENV !== 'production') {
    return { fatal, warnings };
  }

  // --- Core ---
  if (!trim('DATABASE_URL')) {
    fatal.push('DATABASE_URL must be set in production.');
  }

  if (trim('MIGRATE_WEBHOOK_SECRET')) {
    warnings.push(
      'MIGRATE_WEBHOOK_SECRET is set in production — the migrate webhook is never mounted; remove it from production secrets to reduce exposure if NODE_ENV is ever misconfigured.'
    );
  }

  if (isDatabaseSslInsecureEnvRequested()) {
    fatal.push(
      'DATABASE_SSL_INSECURE must not be set in production — PostgreSQL TLS verification cannot be disabled. Remove it from the host environment.'
    );
  }

  // --- JWT (presence is enforced at jwt.ts import; strength is checked here) ---
  const jwtAlg = (trim('JWT_ALG') || 'HS256').toUpperCase();
  if (jwtAlg === 'RS256') {
    if (!trim('JWT_PRIVATE_KEY')) fatal.push('JWT_PRIVATE_KEY is required when JWT_ALG=RS256.');
    if (!trim('JWT_PUBLIC_KEY')) fatal.push('JWT_PUBLIC_KEY is required when JWT_ALG=RS256.');
  } else {
    const secret = trim('JWT_SECRET');
    if (secret.length < 32) {
      fatal.push('JWT_SECRET must be at least 32 characters in production (HS256).');
    }
    if (WEAK_JWT_SECRETS.has(secret.toLowerCase())) {
      fatal.push('JWT_SECRET matches a known weak/default value; use a long random secret.');
    }
  }

  // --- Inbound webhooks (fail closed where the route already does) ---
  // Postmark: webhooks-postmark.ts reads POSTMARK_WEBHOOK_SECRET || POSTMARK_WEBHOOK_PASS (same header verify).
  const postmarkWh = trim('POSTMARK_WEBHOOK_SECRET') || trim('POSTMARK_WEBHOOK_PASS');
  if (!postmarkWh || postmarkWh.length < 8) {
    fatal.push(
      'POSTMARK_WEBHOOK_SECRET or POSTMARK_WEBHOOK_PASS must be set (min 8 characters) in production — inbound Postmark webhooks verify this against X-Postmark-Webhook-Secret.'
    );
  } else if (postmarkWh.length < 16) {
    warnings.push(
      'Postmark webhook secret is under 16 characters — fine for early/sandbox-style setups; prefer 16+ for stronger inbound webhook authentication.'
    );
  }

  if (getBillingProvider() === 'stripe' && !trim('STRIPE_SECRET_KEY')) {
    warnings.push(
      'BILLING_PROVIDER=stripe but STRIPE_SECRET_KEY is unset — runtime treats Stripe as disabled (see isStripeEnabled); confirm billing provider and keys.'
    );
  }

  if (isStripeEnabled()) {
    const wh = getStripeConfig().webhookSecret;
    if (!wh || !wh.startsWith('whsec_') || wh.length < 20) {
      fatal.push(
        'STRIPE_WEBHOOK_SECRET must be a valid signing secret (whsec_…) when Stripe billing is enabled.'
      );
    }
  }

  if (isSumsubApiConfigured()) {
    const wh = resolveSumsubWebhookSecret();
    const sumsubMode = resolveSumsubApiConfig()?.mode;
    const sumsubWhMinLen = sumsubMode === 'sandbox' ? 8 : 16;
    if (!wh.secret) {
      fatal.push(
        'Sumsub API is configured but no webhook secret is set. Set SUMSUB_WEBHOOK_SECRET or SUMSUB_WEBHOOK_SECRET_SANDBOX (matching your mode).'
      );
    } else if (wh.secret.length < sumsubWhMinLen) {
      fatal.push(
        `Sumsub webhook secret (${wh.source}) must be at least ${sumsubWhMinLen} characters in production (${sumsubMode === 'sandbox' ? 'sandbox' : 'live'} mode).`
      );
    }
  }

  const gcToken = trim('GC_ACCESS_TOKEN') || trim('GOCARDLESS_ACCESS_TOKEN');
  if (gcToken) {
    const gcWh = trim('GC_WEBHOOK_SECRET') || trim('GOCARDLESS_WEBHOOK_SECRET');
    if (!gcWh || gcWh.length < 8) {
      fatal.push(
        'GC_WEBHOOK_SECRET or GOCARDLESS_WEBHOOK_SECRET must be set (min 8 characters) when a GoCardless access token is configured (webhook handler accepts either).'
      );
    }
  }

  // --- OneDrive mail import webhook (only if Graph/OneDrive import looks configured) ---
  const odImportLikely = Boolean(trim('GRAPH_CLIENT_ID') || trim('ONEDRIVE_DRIVE_ID'));
  const odBasic =
    Boolean(trim('ONEDRIVE_WEBHOOK_BASIC_USER') && trim('ONEDRIVE_WEBHOOK_BASIC_PASS'));
  const odSecret = trim('ONEDRIVE_WEBHOOK_SECRET');
  if (odImportLikely && !odBasic && !odSecret) {
    warnings.push(
      'OneDrive/Graph mail import appears configured but neither ONEDRIVE_WEBHOOK_SECRET nor ONEDRIVE_WEBHOOK_BASIC_USER/PASS is set — /api/webhooks-onedrive may be unauthenticated.'
    );
  }

  // --- Dangerous / debug flags ---
  if (process.env.RUN_STARTUP_MIGRATIONS === 'true') {
    fatal.push('RUN_STARTUP_MIGRATIONS must not be "true" in production.');
  }

  const disableRateLimitRaw = trim('DISABLE_RATE_LIMIT');
  const disableRateLimitRequested =
    disableRateLimitRaw === '1' || disableRateLimitRaw.toLowerCase() === 'true';
  if (disableRateLimitRequested) {
    fatal.push(
      'DISABLE_RATE_LIMIT must not be enabled in production (unset or use 0). The general API limiter is always on; auth routes use a separate limiter and are unaffected by this flag.'
    );
  }

  if (trim('CORS_DEBUG') === '1') {
    warnings.push('CORS_DEBUG=1 is set — disable in production (verbose CORS logging).');
  }

  if (trim('DEBUG_EMAIL_ENABLED') === '1') {
    fatal.push(
      'DEBUG_EMAIL_ENABLED must not be "1" in production — POST /api/debug-email can send arbitrary template emails when enabled (see debug-email.ts).'
    );
  }

  if (trim('DEBUG_BILLING') === '1') {
    warnings.push('DEBUG_BILLING=1 — verbose billing logging in production; unset unless diagnosing an incident.');
  }

  if (trim('DEBUG_FORWARDING') === '1') {
    warnings.push('DEBUG_FORWARDING=1 — verbose forwarding logging in production; unset unless diagnosing an incident.');
  }

  if (trim('DEV_EMAIL_OVERRIDE')) {
    warnings.push(
      'DEV_EMAIL_OVERRIDE is set — outbound mail is redirected; must be empty on real production mail.'
    );
  }

  if (trim('DEV_SEED_SECRET')) {
    warnings.push(
      'DEV_SEED_SECRET is set in production — dev routes return 404 but remove from prod secret stores to reduce blast radius.'
    );
  }

  // --- Outbound email ---
  if (!trim('POSTMARK_TOKEN')) {
    warnings.push('POSTMARK_TOKEN is unset — transactional email will not send.');
  }

  // --- Ops self-test: optional secret gate ---
  if (trim('OPS_SELFTEST_ENABLED') === '1' && !trim('SELFTEST_SECRET')) {
    warnings.push(
      'OPS_SELFTEST_ENABLED=1 but SELFTEST_SECRET is unset — any authenticated user may run POST /api/ops/self-test.'
    );
  }

  return { fatal, warnings };
}

/**
 * Log warnings, then throw if any fatal issues (stops listen).
 */
export function validateProductionConfigOrThrow(): void {
  const { fatal, warnings } = collectProductionEnvIssues();

  for (const w of warnings) {
    logger.warn(`[env:production] ${w}`);
  }

  if (fatal.length === 0) {
    // Winston level is "warn" in production — use warn so this line appears in host logs.
    logger.warn(
      `[env:production] Validation OK (fatal=0, warnings=${warnings.length}).`
    );
    return;
  }

  for (const f of fatal) {
    logger.error(`[env:production] FATAL: ${f}`);
  }

  throw new Error(
    `Production environment validation failed: ${fatal.length} fatal issue(s). Fix env and restart.`
  );
}
