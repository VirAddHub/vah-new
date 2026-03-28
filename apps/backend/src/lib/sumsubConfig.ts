/**
 * Central Sumsub environment resolution (live vs sandbox matched pairs).
 *
 * Live API credentials never fall back to *_SANDBOX secrets, and sandbox never uses
 * SUMSUB_SECRET_KEY / SUMSUB_APP_SECRET (live-only chain).
 *
 * Optional: SUMSUB_USE_SANDBOX=true forces sandbox when both SUMSUB_APP_TOKEN and
 * SUMSUB_APP_TOKEN_SANDBOX are set (default in that case is live).
 */

export type SumsubMode = 'live' | 'sandbox';

export type SumsubApiSources = {
  token: string;
  secret: string;
  baseUrl: string;
};

export type ResolvedSumsubApi = {
  mode: SumsubMode;
  token: string;
  secret: string;
  baseUrl: string;
  sources: SumsubApiSources;
};

const DEFAULT_API_BASE = 'https://api.sumsub.com';

function trimEnv(name: string): string {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

function useSandboxOverride(): boolean {
  const v = trimEnv('SUMSUB_USE_SANDBOX').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function pickLiveSecret(): { value: string; field: string } {
  const app = trimEnv('SUMSUB_APP_SECRET');
  if (app) return { value: app, field: 'SUMSUB_APP_SECRET' };
  const key = trimEnv('SUMSUB_SECRET_KEY');
  if (key) return { value: key, field: 'SUMSUB_SECRET_KEY' };
  return { value: '', field: '(none)' };
}

function pickSandboxSecret(): { value: string; field: string } {
  const app = trimEnv('SUMSUB_APP_SECRET_SANDBOX');
  if (app) return { value: app, field: 'SUMSUB_APP_SECRET_SANDBOX' };
  const key = trimEnv('SUMSUB_SECRET_KEY_SANDBOX');
  if (key) return { value: key, field: 'SUMSUB_SECRET_KEY_SANDBOX' };
  return { value: '', field: '(none)' };
}

function pickLiveBaseUrl(): { value: string; field: string } {
  for (const n of ['SUMSUB_BASE_URL', 'SUMSUB_API'] as const) {
    const v = trimEnv(n);
    if (v) return { value: v.replace(/\/+$/, ''), field: n };
  }
  return { value: DEFAULT_API_BASE, field: '(default)' };
}

function pickSandboxBaseUrl(): { value: string; field: string } {
  for (const n of ['SUMSUB_BASE_URL_SANDBOX', 'SUMSUB_API_SANDBOX', 'SUMSUB_BASE_URL', 'SUMSUB_API'] as const) {
    const v = trimEnv(n);
    if (v) return { value: v.replace(/\/+$/, ''), field: n };
  }
  return { value: DEFAULT_API_BASE, field: '(default)' };
}

/**
 * Token + secret + base URL for Sumsub REST API (HMAC signing).
 * Returns null if no usable token or the matching secret is missing.
 */
export function resolveSumsubApiConfig(): ResolvedSumsubApi | null {
  const liveToken = trimEnv('SUMSUB_APP_TOKEN');
  const sandboxToken = trimEnv('SUMSUB_APP_TOKEN_SANDBOX');

  let mode: SumsubMode;

  if (liveToken && sandboxToken) {
    mode = useSandboxOverride() ? 'sandbox' : 'live';
  } else if (liveToken) {
    mode = 'live';
  } else if (sandboxToken) {
    mode = 'sandbox';
  } else {
    return null;
  }

  if (mode === 'live') {
    const secret = pickLiveSecret();
    const base = pickLiveBaseUrl();
    if (!liveToken || !secret.value) return null;
    return {
      mode: 'live',
      token: liveToken,
      secret: secret.value,
      baseUrl: base.value,
      sources: {
        token: 'SUMSUB_APP_TOKEN',
        secret: secret.field,
        baseUrl: base.field,
      },
    };
  }

  const secret = pickSandboxSecret();
  const base = pickSandboxBaseUrl();
  if (!sandboxToken || !secret.value) return null;

  return {
    mode: 'sandbox',
    token: sandboxToken,
    secret: secret.value,
    baseUrl: base.value,
    sources: {
      token: 'SUMSUB_APP_TOKEN_SANDBOX',
      secret: secret.field,
      baseUrl: base.field,
    },
  };
}

/**
 * Verification level name for SDK / applicant flows (depends on mode).
 */
export function resolveSumsubLevelName(mode: SumsubMode, fallback: string): { levelName: string; source: string } {
  if (mode === 'sandbox') {
    for (const n of ['SUMSUB_LEVEL_NAME_SANDBOX', 'SUMSUB_LEVEL', 'SUMSUB_LEVEL_NAME'] as const) {
      const v = trimEnv(n);
      if (v) return { levelName: v, source: n };
    }
    return { levelName: fallback, source: `(default: ${fallback})` };
  }
  for (const n of ['SUMSUB_LEVEL', 'SUMSUB_LEVEL_NAME'] as const) {
    const v = trimEnv(n);
    if (v) return { levelName: v, source: n };
  }
  return { levelName: fallback, source: `(default: ${fallback})` };
}

/**
 * Webhook HMAC secret: follows API mode when possible; sandbox prefers *_SANDBOX.
 * SUMSUB_ENV is not used (legacy dashboards only; ignored here).
 */
export function resolveSumsubWebhookSecret(): { secret: string; source: string } {
  const api = resolveSumsubApiConfig();

  if (api?.mode === 'sandbox') {
    const s = trimEnv('SUMSUB_WEBHOOK_SECRET_SANDBOX');
    if (s) return { secret: s, source: 'SUMSUB_WEBHOOK_SECRET_SANDBOX' };
  }

  const live = trimEnv('SUMSUB_WEBHOOK_SECRET');
  if (live) return { secret: live, source: 'SUMSUB_WEBHOOK_SECRET' };

  const sandOnly = trimEnv('SUMSUB_WEBHOOK_SECRET_SANDBOX');
  if (sandOnly) return { secret: sandOnly, source: 'SUMSUB_WEBHOOK_SECRET_SANDBOX' };

  return { secret: '', source: '(none)' };
}

export function isSumsubApiConfigured(): boolean {
  return resolveSumsubApiConfig() != null;
}

export function isSumsubWebhookConfigured(): boolean {
  return resolveSumsubWebhookSecret().secret.length > 0;
}

/**
 * Safe startup log: no secrets, no token values.
 */
export function logSumsubConfigAtStartup(): void {
  const api = resolveSumsubApiConfig();
  const wh = resolveSumsubWebhookSecret();
  const kycLevel = api ? resolveSumsubLevelName(api.mode, 'id-and-liveness') : null;
  const ownerLevel = api ? resolveSumsubLevelName(api.mode, 'basic-kyc') : null;

  if (!api) {
    console.info('[SUMSUB] api: not configured (set SUMSUB_APP_TOKEN or SUMSUB_APP_TOKEN_SANDBOX + matching secret)');
    console.info('[SUMSUB] webhook:', wh.source !== '(none)' ? `configured (${wh.source})` : 'not configured');
    return;
  }

  console.info('[SUMSUB] api:', {
    mode: api.mode,
    tokenEnv: api.sources.token,
    secretEnv: api.sources.secret,
    baseUrl: api.baseUrl,
    baseUrlEnv: api.sources.baseUrl,
    kycLevel: kycLevel?.levelName,
    kycLevelEnv: kycLevel?.source,
    ownerLevel: ownerLevel?.levelName,
    ownerLevelEnv: ownerLevel?.source,
  });
  console.info('[SUMSUB] webhook:', wh.source !== '(none)' ? `configured (${wh.source})` : 'not configured');
}
