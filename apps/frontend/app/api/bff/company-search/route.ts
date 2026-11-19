import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { clientIpHeaders } from "@/lib/server/clientIpHeaders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Company name search for signup and verification. Goes through the API (not straight to
 * Companies House) so the shared Companies House allowance is rate limited per visitor and cached.
 */
export async function GET(req: NextRequest) {
  const query = (new URL(req.url).searchParams.get("query") || "").trim();
  if (query.length < 2) return NextResponse.json({ ok: true, businesses: [], isLastBatch: true });
  try {
    const res = await fetch(`${getBackendOrigin()}/api/companies-house/search?q=${encodeURIComponent(query)}`, {
      headers: { accept: "application/json", ...clientIpHeaders(req) },
      cache: "no-store",
    });
    const json: any = await res.json().catch(() => null);
    if (res.status === 429) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    if (!res.ok || !json?.ok) return NextResponse.json({ ok: false, error: json?.error || "upstream_error" }, { status: res.status >= 500 ? 502 : res.status });
    const items: any[] = Array.isArray(json.data) ? json.data : [];
    const businesses = items.slice(0, 10).map(i => ({
      title: i.title ?? "",
      regNumber: i.company_number ?? "",
      identifier: i.company_number ?? "",
      status: i.company_status ?? undefined,
      addressSnippet: i.address_snippet ?? undefined,
    }));
    return NextResponse.json({ ok: true, businesses, isLastBatch: items.length < 10 });
  } catch (err) {
    console.error("[company-search] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
