import { NextRequest, NextResponse } from "next/server";

const ORIGIN = process.env.BACKEND_API_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://vah-api-staging.onrender.com';

export async function proxy(req: NextRequest, targetPath: string) {
  const url = new URL(req.url);
  const qs = url.search; // keeps ?page=... etc
  const target = `${ORIGIN}${targetPath}${qs}`;

  const headers = new Headers();
  // forward cookies + content headers (avoid origin/host)
  if (req.headers.get("cookie")) headers.set("cookie", req.headers.get("cookie")!);
  if (req.headers.get("content-type")) headers.set("content-type", req.headers.get("content-type")!);
  if (req.headers.get("authorization")) headers.set("authorization", req.headers.get("authorization")!);

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    // do not set credentials here (server-to-server)
    cache: "no-store",
  };

  const r = await fetch(target, init);
  // stream back response; preserve status
  const blob = await r.blob();
  const res = new NextResponse(blob, { status: r.status, statusText: r.statusText });
  // pass through important headers (json, pagination, rate limits)
  r.headers.forEach((v, k) => {
    if (/^(content-type|x-|ratelimit-|link|set-cookie)$/i.test(k)) res.headers.set(k, v);
  });
  return res;
}
