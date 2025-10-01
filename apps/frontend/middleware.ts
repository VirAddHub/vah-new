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

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isInternal(pathname)) return NextResponse.next();

  // Check for JWT token in cookies (since middleware can't access localStorage)
  const jwtToken = req.cookies.get('vah_jwt')?.value;
  const hasToken = !!jwtToken && jwtToken !== 'null' && jwtToken !== 'undefined';
  const isLogin = pathname === '/login';

  // If no token at all, redirect to login
  if (!hasToken && !isLogin) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname + search);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set('x-loop-guard', 'mw->login');
    return res;
  }

  // If we have a token, validate it with the backend
  if (hasToken) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const whoamiResponse = await fetch(`${backendUrl}/api/auth/whoami`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
      });

      const isValidToken = whoamiResponse.ok;
      
      if (!isValidToken) {
        // Token is invalid/expired, clear it and redirect to login
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('next', pathname + search);
        const res = NextResponse.redirect(loginUrl);
        res.headers.set('x-loop-guard', 'mw->login-invalid-token');
        // Clear the invalid token cookie
        res.cookies.set('vah_jwt', '', { expires: new Date(0), path: '/' });
        return res;
      }

      // Token is valid - if on login page, redirect to dashboard
      if (isLogin) {
        const next = req.nextUrl.searchParams.get('next') || '/dashboard';
        if (next !== pathname) {
          const res = NextResponse.redirect(new URL(next, req.url));
          res.headers.set('x-loop-guard', 'login->next');
          return res;
        }
      }
    } catch (error) {
      // Network error or other issue - treat as invalid token
      console.error('Middleware token validation failed:', error);
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', pathname + search);
      const res = NextResponse.redirect(loginUrl);
      res.headers.set('x-loop-guard', 'mw->login-validation-error');
      return res;
    }
  }

  return NextResponse.next();
}
