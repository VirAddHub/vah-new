import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '../../../../_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/bff/payments/stripe/publishable-key
 * Proxies to backend. If backend returns 503 (Stripe not configured),
 * we return 200 with null key so the frontend can degrade gracefully
 * instead of showing a failed request.
 */
export async function GET(request: NextRequest) {
  const res = await proxy(request, '/api/payments/stripe/publishable-key');
  if (res.status === 503) {
    return NextResponse.json(
      { ok: true, data: { publishable_key: null } },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
  return res;
}
