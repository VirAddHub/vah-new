/**
 * Adds the signed visitor address to every server-side request this website makes to the API,
 * so rate limits apply per visitor rather than to the website as a whole. Routes that already
 * send the headers are left alone.
 *
 * Installed from instrumentation.ts and re-checked by getBackendOrigin() on every API call,
 * because the Next.js development server resets the global fetch when it recompiles.
 */
import { visitorIp, signedVisitorHeaders } from './clientIpHeaders';

const FLAG = Symbol.for('vah.visitorFetch');
type FetchFn = typeof fetch & { [FLAG]?: true };

function apiOrigins(): string[] {
  return [process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN, process.env.BACKEND_API_ORIGIN, process.env.NEXT_PUBLIC_API_URL]
    .map(v => (v || '').trim().replace(/\/+$/, '').replace(/\/api$/, ''))
    .filter(Boolean);
}

function currentRequestHeaders(): { get(name: string): string | null } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external');
    const store = workUnitAsyncStorage?.getStore?.();
    return store && store.type === 'request' && store.headers ? store.headers : null;
  } catch {
    return null;
  }
}

export function installVisitorFetch(): void {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return; // no visitors while building
  const current = globalThis.fetch as FetchFn | undefined;
  if (typeof current !== 'function' || current[FLAG]) return;
  const origins = apiOrigins();
  if (!origins.length) return;
  const original = current;

  const wrapped: FetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (origins.some(o => url.startsWith(o + '/'))) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has('x-vah-client-ip')) {
          // Read the incoming request's headers only when handling a live request. During static
          // generation or revalidation there is no visitor, and calling headers() there would force
          // the page to become dynamic.
          const incoming = currentRequestHeaders();
          const extra = incoming ? signedVisitorHeaders(visitorIp(incoming)) : {};
          if (Object.keys(extra).length) {
            for (const [k, v] of Object.entries(extra)) headers.set(k, v);
            init = { ...init, headers };
          }
        }
      }
    } catch {
      // Not in a request: send the request unchanged.
    }
    return original(input as RequestInfo, init);
  };
  wrapped[FLAG] = true;
  globalThis.fetch = wrapped;
}
