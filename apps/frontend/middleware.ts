import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal routes and static assets
  if (pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')) {
    const response = NextResponse.next();
    // Cache static assets for 1 year
    if (pathname.startsWith('/_next/static/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/icons/') ||
      pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      response.headers.set(
        'Cache-Control',
        'public, max-age=31536000, immutable'
      );
    }
    return response;
  }

  // Redirect /dashboard to /mail (mail inbox is the default dashboard view)
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL('/mail', request.url));
  }
  // Legacy email links: redirect to correct dashboard routes (both are protected)
  if (pathname === '/support' || pathname === '/support/') {
    return NextResponse.redirect(new URL('/account/support', request.url));
  }
  if (pathname === '/profile' || pathname === '/profile/') {
    return NextResponse.redirect(new URL('/account/verification', request.url));
  }

  // Protected routes that require authentication
  // Exceptions: public routes (no auth required)
  const isPublicAccountRoute = pathname === '/account/confirm-email' || pathname.startsWith('/account/confirm-email/');
  const isPublicVerifyRoute = pathname === '/verify-owner' || pathname.startsWith('/verify-owner/');
  const isPublicEmailChangeRoute = pathname === '/verify-email-change' || pathname.startsWith('/verify-email-change/');
  // All dashboard routes (dashboard group redirects /dashboard -> /mail; /mail, /forwarding, etc. are under (dashboard))
  const PROTECTED_PREFIXES = ['/dashboard', '/account', '/admin', '/mail', '/forwarding', '/billing', '/business-owners'];
  const isProtectedRoute = !isPublicAccountRoute && !isPublicVerifyRoute && !isPublicEmailChangeRoute && PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));

  // Check for authentication cookie
  if (isProtectedRoute) {
    const sessionCookie = request.cookies.get('vah_session');
    // More strict validation - check for empty, null, undefined, or very short values
    const hasValidSession = sessionCookie &&
      sessionCookie.value !== 'null' &&
      sessionCookie.value !== 'undefined' &&
      sessionCookie.value !== '' &&
      sessionCookie.value.trim().length > 10;

    if (!hasValidSession) {
      // Only redirect if not already going to login (prevent redirect loops)
      if (pathname !== '/login') {
        // Redirect to login with next parameter
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  const response = NextResponse.next();

  // Cache API routes for 5 minutes with stale-while-revalidate
  if (pathname.startsWith('/api/')) {
    // Skip caching for auth and dynamic endpoints
    if (pathname.includes('/auth/') ||
      pathname.includes('/webhooks/') ||
      pathname.includes('/analytics/')) {
      response.headers.set(
        'Cache-Control',
        'no-cache, no-store, must-revalidate'
      );
    } else {
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=3600'
      );
    }
  }

  // Cache static pages for 1 hour
  if (pathname === '/' ||
    pathname === '/about' ||
    pathname === '/help' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/kyc-policy') {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
  }

  // Cache blog pages for 30 minutes
  if (pathname.startsWith('/blog/')) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=3600'
    );
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Add CORS headers for API routes (FIND-03: allowlist replaces wildcard)
  if (pathname.startsWith('/api/')) {
    const ALLOWED_ORIGINS = new Set([
      'https://virtualaddresshub.co.uk',
      'https://www.virtualaddresshub.co.uk',
      // Add staging / preview URLs here if needed:
      // 'https://staging.virtualaddresshub.co.uk',
    ]);

    const origin = request.headers.get('origin') ?? '';
    const allowOrigin = ALLOWED_ORIGINS.has(origin)
      ? origin
      : 'https://virtualaddresshub.co.uk'; // Safe default: never wildcard

    response.headers.set('Access-Control-Allow-Origin', allowOrigin);
    response.headers.set('Vary', 'Origin'); // Ensure CDN/proxy caches per-origin
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }

  // FIND-07: Add HSTS to enforce HTTPS on all routes
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};