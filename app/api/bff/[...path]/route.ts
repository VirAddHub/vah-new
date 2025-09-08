import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic"; // no caching for proxy

const ORIGIN = process.env.BACKEND_API_ORIGIN || "http://localhost:4000/api";

function buildTarget(req: NextRequest, path: string[]) {
  const joined = path.join("/");
  const qs = req.nextUrl.search || "";
  return `${ORIGIN}/${joined}${qs}`;
}

async function forward(method: string, req: NextRequest, path: string[]) {
  const target = buildTarget(req, path);
  try {
    const headers = new Headers(req.headers);
    headers.delete("host");
    const body = method === "GET" || method === "HEAD" ? undefined : await req.text();

    const res = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });

    const outHeaders = new Headers(res.headers);
    outHeaders.set("cache-control", "no-store");
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: "proxy_error",
        method,
        target,
        message: String(e?.message || e),
      }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward("GET", req, params.path);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward("POST", req, params.path);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward("PUT", req, params.path);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward("DELETE", req, params.path);
}
// handle CORS preflight if the browser sends it
export async function OPTIONS(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward("OPTIONS", req, params.path);
}
