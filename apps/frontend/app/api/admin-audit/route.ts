import { NextRequest } from "next/server";
import { proxy } from "../_lib/proxy";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/admin-audit?limit=20&offset=0&type=admin|auth
 * Proxies to backend admin-audit routes.
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  if (type === 'auth') {
    return proxy(req, '/admin-audit/mail-audit');
  }
  return proxy(req, '/admin-audit/');
}
