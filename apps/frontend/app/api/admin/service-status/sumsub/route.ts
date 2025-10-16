export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest } from 'next/server';
import { proxy } from '../../../_lib/proxy';

export async function GET(req: NextRequest) {
  return proxy(req, '/admin/service-status/sumsub');
}
