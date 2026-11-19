import { NextRequest } from 'next/server';
import { proxy } from '../../_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/** The single access decision for the signed-in customer (backend: services/access.ts). */
export async function GET(req: NextRequest) {
  return proxy(req, '/access');
}
