import { NextRequest } from "next/server";
import { proxy } from "../../_lib/proxy";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  return proxy(req, "/api/admin/users");
}

export async function POST(req: NextRequest) {
  return proxy(req, "/api/admin/users");
}