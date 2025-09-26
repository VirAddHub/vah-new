// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  // Only guard truly protected pages
  matcher: ['/admin/:path*', '/dashboard'],
};

function isInternal(pathname: string) {
  // Guard against internal Next.js paths, API routes, and assets
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // General check for static files
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isInternal(pathname)) return NextResponse.next();

  // Primary session check: Use the 'sid' cookie set by the backend.
  const hasSession = !!req.cookies.get('sid') || !!req.cookies.get('vah_session');
  const isLogin = pathname === '/login';

  // SCENARIO 1: Not logged in → Force to /login (with next parameter)
  if (!hasSession && !isLogin) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname + search);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set('x-loop-guard', 'mw->login');
    return res;
  }

  // SCENARIO 2: Logged in but landed on /login → Send them to next (or /dashboard)
  if (hasSession && isLogin) {
    const next = req.nextUrl.searchParams.get('next') || '/dashboard';
    if (next !== pathname) { // Prevent redirecting to the page you are already on
      const res = NextResponse.redirect(new URL(next, req.url));
      res.headers.set('x-loop-guard', 'login->next');
      return res;
    }
  }

  return NextResponse.next();
}
