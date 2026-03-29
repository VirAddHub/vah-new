import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAllowedBffCorsOrigin } from './lib/bffCorsAllowlist';

/**
 * Edge middleware — UX / navigation hints only. This is NOT authentication or authorization.
 *
 * Does not verify JWT signatures (no secrets in Edge, no duplicate of backend auth). Does not
 * call `GET /api/bff/auth/whoami` or any backend. Every protected page must still enforce access
 * in Server Components, Route Handlers, BFF routes, and the API (`requireAuth`, `requireAdmin`, etc.).
 *
 * For some HTML routes we only ask: does the `vah_session` cookie *look like* an unverified
 * JWT-shaped blob (three base64url-like segments of non-trivial length)? That cuts empty,
 * placeholder, and obvious junk cookies. A positive result does **not** mean valid, unexpired,
 * non-revoked, or permitted — only “worth letting the request reach the app so real auth can run.”
 */

const SESSION_COOKIE_NAME = 'vah_session';

/** Minimum chars per segment — rejects trivial `x.y.z` placeholders; real JWT parts are longer. */
const MIN_JWT_SHAPED_SEGMENT_LEN = 4;

/**
 * True if the cookie value has the *shape* of a compact JWT (header.payload.signature) without
 * verifying crypto or claims. For middleware UX gating only.
 */
function hasPlausibleUnverifiedSessionCookieShape(raw: string | undefined): boolean {
  if (raw == null) return false;
  const v = raw.trim();
  if (!v || v === 'null' || v === 'undefined') return false;
  const parts = v.split('.');
  if (parts.length !== 3) return false;
  for (const p of parts) {
    if (p.length < MIN_JWT_SHAPED_SEGMENT_LEN) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(p)) return false;
  }
  return true;
}

/**
 * Baseline headers for HTML, `/api` Route Handlers, and static paths that pass through middleware.
 * (Applied to `NextResponse.next()` so they merge onto the final response; does not replace
 * route-specific `Cache-Control` or BFF CORS headers added elsewhere.)
 */
function applySecurityHeaders(response: NextResponse, _request: NextRequest) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  // Allow Sumsub WebSDK iframe (in.sumsub.com) to use camera/mic for liveness checks.
  // camera=() / microphone=() blocks *all* contexts, including cross-origin iframes — breaks KYC on every device.
  response.headers.set(
    'Permissions-Policy',
    'camera=(self "https://in.sumsub.com" "https://static.sumsub.com"), microphone=(self "https://in.sumsub.com" "https://static.sumsub.com"), geolocation=()'
  );
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
}

/** CORS on Next `/api/*` is only relevant for cross-origin callers; omit when no Origin (same-origin). */
function applyBffCorsHeaders(response: NextResponse, request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/api/')) return;
  const origin = request.headers.get('origin');
  const isProd = process.env.NODE_ENV === 'production';
  if (!origin || !isAllowedBffCorsOrigin(origin, isProd)) return;
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Cache-Control, Pragma'
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // `/api` before `includes('.')` so paths like `/api/v1.0/...` always get BFF cache + security
  // headers here instead of only the generic static branch.
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    if (pathname.startsWith('/api/')) {
      if (
        pathname.includes('/auth/') ||
        pathname.includes('/webhooks/') ||
        pathname.includes('/analytics/')
      ) {
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      }
    }
    applySecurityHeaders(response, request);
    applyBffCorsHeaders(response, request);
    return response;
  }

  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    const response = NextResponse.next();
    if (
      pathname.startsWith('/_next/static/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/icons/') ||
      pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
    ) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    applySecurityHeaders(response, request);
    return response;
  }

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL('/mail', request.url));
  }
  if (pathname === '/support' || pathname === '/support/') {
    return NextResponse.redirect(new URL('/account/support', request.url));
  }
  if (pathname === '/profile' || pathname === '/profile/') {
    return NextResponse.redirect(new URL('/account/verification', request.url));
  }

  const isPublicAccountRoute =
    pathname === '/account/confirm-email' || pathname.startsWith('/account/confirm-email/');
  const isPublicVerifyRoute = pathname === '/verify-owner' || pathname.startsWith('/verify-owner/');
  const isPublicEmailChangeRoute =
    pathname === '/verify-email-change' || pathname.startsWith('/verify-email-change/');
  const PROTECTED_PREFIXES = [
    '/dashboard',
    '/account',
    '/admin',
    '/mail',
    '/forwarding',
    '/billing',
    '/business-owners',
  ];
  const isProtectedRoute =
    !isPublicAccountRoute &&
    !isPublicVerifyRoute &&
    !isPublicEmailChangeRoute &&
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // UX-only: redirect likely logged-out visitors to /login before paint. Server/BFF still authorises.
  if (isProtectedRoute) {
    const sessionCookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!hasPlausibleUnverifiedSessionCookieShape(sessionCookieValue)) {
      if (pathname !== '/login') {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  const response = NextResponse.next();

  if (pathname === '/' ||
    pathname === '/about' ||
    pathname === '/help' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/kyc-policy') {
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  }

  if (pathname.startsWith('/blog/')) {
    response.headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  }

  applySecurityHeaders(response, request);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
