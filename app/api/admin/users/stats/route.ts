import { NextRequest } from "next/server";
import { proxy } from "../../../_lib/proxy";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxy(req, "/api/admin/users/stats");
}