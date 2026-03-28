import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";

export const dynamic = "force-dynamic";

const CSRF_COOKIE_NAME = "vah_csrf_token";

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.split("=");
    if (!name?.trim()) continue;
    const key = name.trim();
    const value = rest.join("=").trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

/**
 * POST /api/bff/kyc/sync-from-sumsub
 * Proxies to backend: pull Sumsub applicant review and update kyc_status.
 */
export async function POST(req: NextRequest) {
  const routePath = "/api/bff/kyc/sync-from-sumsub";
  let backendUrl = "";

  try {
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/kyc/sync-from-sumsub`;

    const rawCookieHeader = req.headers.get("cookie") ?? "";
    const cookies = parseCookies(rawCookieHeader);
    let csrfToken = cookies[CSRF_COOKIE_NAME] || "";
    let finalCookieHeader = rawCookieHeader;

    if (!csrfToken) {
      try {
        const csrfResponse = await fetch(`${backend}/api/csrf`, {
          method: "GET",
          headers: { Cookie: rawCookieHeader },
          cache: "no-store",
        });
        const csrfJson = await csrfResponse.json().catch(() => ({}));
        const fromBody = typeof csrfJson?.csrfToken === "string" ? csrfJson.csrfToken.trim() : "";
        if (fromBody) {
          csrfToken = fromBody;
          finalCookieHeader = rawCookieHeader
            ? `${rawCookieHeader}; ${CSRF_COOKIE_NAME}=${csrfToken}`
            : `${CSRF_COOKIE_NAME}=${csrfToken}`;
        }
      } catch (e) {
        console.warn(`[${routePath}] CSRF bootstrap failed`, e);
      }
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      cookie: finalCookieHeader,
    };
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers,
      cache: "no-store",
    });

    const text = await backendRes.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text.slice(0, 400) };
    }

    return NextResponse.json(data as object, { status: backendRes.status });
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: "SERVER_MISCONFIGURED", message: (error as Error).message },
        { status: 500 }
      );
    }
    console.error(`[${routePath}]`, error);
    return NextResponse.json(
      { ok: false, error: "proxy_failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
