import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protect app routes: if not authenticated, bounce to /login?next=…
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const protectedPrefixes = [
    '/dashboard',
    '/billing',
    '/mail',
    '/forwarding',
    '/profile',
    '/admin',
  ];
  const needsAuth = protectedPrefixes.some(p => path === p || path.startsWith(p + '/'));

  if (!needsAuth) return NextResponse.next();

  // You might store auth via a session cookie. Replace this check with your real logic.
  const hasSession = Boolean(req.cookies.get('vah_sid')?.value);
  const role = req.cookies.get('vah_role')?.value || 'user';

  if (!hasSession) {
    const login = req.nextUrl.clone();
    login.pathname = '/login';
    login.searchParams.set('next', path + (url.search || ''));
    return NextResponse.redirect(login);
  }

  // Optionally, guard /admin for staff/admin/owner only
  if (path.startsWith('/admin') && !['staff', 'admin', 'owner'].includes(role)) {
    const login = req.nextUrl.clone();
    login.pathname = '/login';
    login.searchParams.set('next', '/dashboard');
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/billing/:path*',
    '/mail/:path*',
    '/forwarding/:path*',
    '/profile',
    '/admin/:path*',
  ],
};