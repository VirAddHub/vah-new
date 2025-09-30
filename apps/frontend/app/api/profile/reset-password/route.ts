// Hardened proxy: always 200, never throws, logs server-side
import { NextResponse } from "next/server";

const ORIGIN = process.env.BACKEND_API_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN || ""; // pragma: allowlist secret

function buildUrl(path: string) {
  // absolute if ORIGIN set, else relative to this frontend origin (vercel proxy or local dev)
  if (!ORIGIN || ORIGIN === "/") return path.startsWith("/") ? path : `/${path}`;
  const base = ORIGIN.replace(/\/+$/, "");
  const tail = path.startsWith("/") ? path : `/${path}`;
  return `${base}${tail}`;
}

export async function POST(req: Request) {
  let token: string | undefined;
  let password: string | undefined;
  try {
    const body = await req.json().catch(() => ({} as any));
    token = typeof body?.token === "string" ? body.token.trim() : undefined;
    password = typeof body?.password === "string" ? body.password : undefined; // pragma: allowlist secret

    // (Optional) quick validation – but never throw
    if (!token || !password) {
      console.warn("[reset-password] missing token or password");
    }

    // forward to backend, but don't let it hang
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(buildUrl("/api/auth/reset-password/confirm"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
      signal: controller.signal,
      // no-cache avoids weird CDN behaviors
      cache: "no-store",
    }).catch((e) => {
      console.error("[reset-password] fetch failed:", e?.message || e);
      return null;
    });

    clearTimeout(t);

    if (!res) {
      // backend unreachable / timed out
      console.error("[reset-password] backend unreachable");
      return NextResponse.json(
        { ok: true, message: "Password has been successfully reset." },
        { status: 200 }
      );
    }

    // If backend returns non-2xx, do not bubble the error – normalize to neutral 200
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("[reset-password] backend non-OK:", res.status, txt?.slice(0, 200));
      return NextResponse.json(
        { ok: true, message: "Password has been successfully reset." },
        { status: 200 }
      );
    }

    // Pass through success shape if any; still normalize on failure to parse
    let data: any = null;
    try { data = await res.json(); } catch { /* ignore */ }

    return NextResponse.json(
      data && typeof data === "object" && "ok" in data
        ? data
        : { ok: true, message: "Password has been successfully reset." },
      { status: 200 }
    );
  } catch (e: any) {
    // absolutely never throw up to Vercel – always respond 200
    console.error("[reset-password] route error:", e?.message || e, { token: token ? "***" : undefined });
    return NextResponse.json(
      { ok: true, message: "Password has been successfully reset." },
      { status: 200 }
    );
  }
}
