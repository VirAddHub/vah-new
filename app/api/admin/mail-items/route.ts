export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest } from 'next/server';
import { proxy } from '../../_lib/proxy';

export async function GET(req: NextRequest) {
  return proxy(req, '/api/admin/mail-items');
}

export async function POST(req: NextRequest) {
  return proxy(req, '/api/admin/mail-items');
}