import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  // protect only the admin area
  matcher: ['/admin/:path*'],
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Always allow API and static assets
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/assets')) {
    return NextResponse.next();
  }

  // ✅ check for the session cookie the backend actually sets
  const hasSession = !!req.cookies.get('vah_session')?.value;

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/login') {
      url.searchParams.set('next', pathname + (search || ''));
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
