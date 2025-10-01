// middleware.ts
// Simple, robust middleware for protecting routes
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  // Only protect these routes - middleware will NOT run on other pages
  matcher: ['/admin/:path*', '/dashboard/:path*', '/dashboard'],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip internal Next.js routes and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for JWT token in cookies
  const jwtToken = req.cookies.get('vah_jwt')?.value;
  const hasToken = !!jwtToken && jwtToken !== 'null' && jwtToken !== 'undefined' && jwtToken.length > 10;

  // If no valid token, redirect to login with next parameter
  if (!hasToken) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists - allow access to protected route
  // Note: We don't validate the token here because:
  // 1. Middleware runs on Edge runtime and can't easily call backend
  // 2. The backend API will validate the token on every request
  // 3. If token is invalid, API calls will fail and user will be logged out
  return NextResponse.next();
}
