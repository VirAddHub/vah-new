import { NextRequest } from "next/server";
import { proxy } from "../../../_lib/proxy";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * POST /api/admin/users/send-password-reset?id=<userId>
 * Proxies to backend: POST /api/admin/users/:id/send-password-reset
 */
export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });
  }
  return proxy(req, `/admin/users/${id}/send-password-reset`);
}
