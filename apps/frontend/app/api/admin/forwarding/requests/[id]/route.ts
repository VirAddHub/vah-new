import { NextRequest } from "next/server";
import { proxy } from "../../../../_lib/proxy";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxy(req, `/admin/forwarding/requests/${params.id}`);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxy(req, `/admin/forwarding/requests/${params.id}`);
}
