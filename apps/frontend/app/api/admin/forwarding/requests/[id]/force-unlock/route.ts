import { NextRequest } from "next/server";
import { proxy } from "../../../../../_lib/proxy";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(req, `/admin/forwarding/requests/${id}/force-unlock`);
}
