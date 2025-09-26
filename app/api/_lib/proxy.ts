export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

const ORIGIN = process.env.BACKEND_API_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://vah-api-staging.onrender.com';

export async function proxy(req: NextRequest, targetPath: string) {
  const url = new URL(req.url);
  const target = `${ORIGIN}${targetPath}${url.search}`;

  // Build outbound headers
  const headers = new Headers();

  // Preserve auth + cookies + content-type
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  // Useful for backend logs & same-site checks
  const ip = req.headers.get("x-forwarded-for") || req.ip || "";
  if (ip) headers.set("x-forwarded-for", ip);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
  };

  const r = await fetch(target, init);

  // Stream through response body
  const resp = new NextResponse(r.body, {
    status: r.status,
    statusText: r.statusText,
  });

  // Pass useful headers through. Use append for multiple Set-Cookie.
  r.headers.forEach((val, key) => {
    const k = key.toLowerCase();
    if (k === "set-cookie") {
      // important: don't lose multiple cookies
      resp.headers.append("set-cookie", val);
      return;
    }
    if (/^(content-type|x-|ratelimit-|link|cache-control)$/i.test(key)) {
      resp.headers.set(key, val);
    }
  });

  return resp;
}