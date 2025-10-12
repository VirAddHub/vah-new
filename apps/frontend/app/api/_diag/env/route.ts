export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV,
    backendOrigin: process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN ?? null,
  });
}
