import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

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

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

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