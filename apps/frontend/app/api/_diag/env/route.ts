export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { type NextRequest, NextResponse } from 'next/server';
import { requireBffAdmin } from '@/lib/server/requireBffAdmin';

export async function GET(req: NextRequest) {
  // Admin-only: requires an authenticated admin session (same guard as all BFF admin routes).
  // Returns 401 if unauthenticated, 403 if authenticated but not an admin.
  const denied = await requireBffAdmin(req);
  if (denied) return denied;

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV,
    backendOrigin: process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN ?? null,
  });
}
