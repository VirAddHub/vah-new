export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // This endpoint provides the Ideal Postcodes API key to the frontend
  // In production, you might want to add additional security checks

  const apiKey = process.env.IDEAL_POSTCODES_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'API key not configured'
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    apiKey: apiKey
  });
}
