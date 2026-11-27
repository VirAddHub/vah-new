import { NextRequest } from "next/server";
import { proxy } from "@/app/api/_lib/proxy";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Staff change a customer's legal name, with the reason and document checked (recorded permanently).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(req, `/admin/users/${id}/name-change`);
}
