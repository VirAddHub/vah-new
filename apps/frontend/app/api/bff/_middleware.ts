// apps/frontend/app/api/bff/_middleware.ts
// BFF Safety Guard - Blocks non-GET requests when BFF_READS_ONLY=1

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Only apply to BFF routes
  if (!req.nextUrl.pathname.startsWith('/api/bff/')) {
    return NextResponse.next();
  }

  // Check if BFF writes are disabled
  if (process.env.BFF_READS_ONLY === "1" && req.method !== "GET") {
    console.warn(`[BFF Guard] Blocked ${req.method} request to ${req.nextUrl.pathname} - BFF_READS_ONLY=1`);
    
    return new NextResponse(
      JSON.stringify({ 
        ok: false, 
        message: "BFF writes disabled - use direct backend API",
        code: "BFF_WRITES_DISABLED",
        suggestedAction: "Call backend API directly with Bearer token"
      }),
      { 
        status: 410, // Gone - indicates this method is no longer available
        headers: { 
          "Content-Type": "application/json",
          "X-BFF-Guard": "enabled"
        } 
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/bff/:path*'
};
