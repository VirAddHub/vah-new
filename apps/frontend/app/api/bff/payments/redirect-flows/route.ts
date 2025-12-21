import { NextRequest } from 'next/server';
import { proxy } from '../../../_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  return proxy(request, '/api/payments/redirect-flows');
}

