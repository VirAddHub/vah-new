import { NextRequest } from "next/server";
import { proxy } from "../../../../_lib/proxy";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxy(req, `/api/admin/users/${params.id}/restore`);
}