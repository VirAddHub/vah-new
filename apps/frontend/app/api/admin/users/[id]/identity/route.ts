import { NextRequest } from 'next/server';
import { proxy } from '@/app/api/_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Admin: identity results for a customer's account holder and owners (the API enforces the admin role).
type Ctx = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return proxy(req, `/admin/users/${encodeURIComponent(id)}/identity`);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return proxy(req, `/admin/users/${encodeURIComponent(id)}/identity`);
}
