import { NextRequest } from 'next/server';
import { proxy } from '@/app/api/_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return proxy(req, '/admin/ch-verification/submissions');
}
