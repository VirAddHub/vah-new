import { NextRequest } from "next/server";
import { proxy } from "@/app/api/_lib/proxy";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(req, `/admin/users/${id}/name-changes`);
}
