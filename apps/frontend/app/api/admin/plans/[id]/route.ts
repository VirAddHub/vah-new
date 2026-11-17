import { NextRequest } from 'next/server';
import { proxy } from '@/app/api/_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return proxy(req, `/admin/plans/${encodeURIComponent(id)}`);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return proxy(req, `/admin/plans/${encodeURIComponent(id)}`);
}
