export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // This endpoint provides the Ideal Postcodes API key to the frontend
  // In production, you might want to add additional security checks

  // Always return 200. Never throw if key missing.
  const key = process.env.IDEAL_POSTCODES_API_KEY || null;
  return NextResponse.json({ ok: true, key });
}
