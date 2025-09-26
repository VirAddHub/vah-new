import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const role = req.cookies.get("vah_role")?.value;
  if (role !== "admin" && role !== "owner") {
    const url = new URL("/login?next=" + encodeURIComponent(req.nextUrl.pathname), req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
