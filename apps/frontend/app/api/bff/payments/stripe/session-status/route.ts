import { NextRequest } from 'next/server';
import { proxy } from '../../../../_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return proxy(request, '/api/payments/stripe/session-status');
}
