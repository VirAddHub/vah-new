import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED = [/^\/dashboard/, /^\/mail/, /^\/billing/, /^\/profile/, /^\/support/];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const needsAuth = PROTECTED.some(rx => rx.test(pathname));
  if (!needsAuth) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get("vah_session"));
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  const search = req.nextUrl.search || "";
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico).*)'],
};
