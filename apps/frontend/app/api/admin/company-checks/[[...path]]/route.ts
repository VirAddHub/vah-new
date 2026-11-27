import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/app/api/_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Admin Company checks: pass-through to the API, which enforces the admin role on every route.
type Ctx = { params: Promise<{ path?: string[] }> };
const SEGMENT = /^[A-Za-z0-9_-]{1,40}$/;

async function forward(req: NextRequest, { params }: Ctx) {
  const { path = [] } = await params;
  if (path.length > 4 || !path.every(p => SEGMENT.test(p))) {
    return NextResponse.json({ ok: false, error: 'invalid_path' }, { status: 400 });
  }
  return proxy(req, `/admin/company-checks${path.length ? `/${path.join('/')}` : ''}`);
}

export const GET = forward;
export const POST = forward;
