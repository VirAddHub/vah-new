import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "vah_jwt";

export function middleware(req: NextRequest) {
  const { pathname, origin, searchParams } = req.nextUrl;
  const isAuthed = Boolean(req.cookies.get(AUTH_COOKIE)?.value);

  const isAuthRoute =
    pathname === "/login" || pathname === "/signup" || pathname.startsWith("/auth/");
  const isProtected =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/") ||
    pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAuthed && isAuthRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!isAuthed && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/login") {
      url.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""));
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/auth/:path*", "/dashboard/:path*", "/admin/:path*"],
};
