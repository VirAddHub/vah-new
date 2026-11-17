import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { clientIpHeaders } from "@/lib/server/clientIpHeaders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Company details by number, through the API (rate limited per visitor). */
export async function GET(req: NextRequest) {
  const identifier = (new URL(req.url).searchParams.get("identifier") || "").trim();
  if (!/^[A-Za-z0-9]{6,10}$/.test(identifier)) return NextResponse.json({ ok: false, error: "invalid_identifier" }, { status: 400 });
  try {
    const res = await fetch(`${getBackendOrigin()}/api/companies-house/company/${encodeURIComponent(identifier)}`, {
      headers: { accept: "application/json", ...clientIpHeaders(req) },
      cache: "no-store",
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) return NextResponse.json({ ok: false, error: json?.error || "upstream_error" }, { status: res.status === 404 || res.status === 429 ? res.status : 502 });
    const d = json.data ?? {};
    return NextResponse.json({
      ok: true,
      name: d.company_name ?? "",
      companyNumber: d.company_number ?? "",
      type: d.company_type ?? "",
      status: d.company_status ?? "",
      dateOfIncorporation: d.date_of_creation ?? "",
      registeredOfficeAddress: d.registered_office_address ?? null,
      sicCodes: d.sic_codes ?? [],
    });
  } catch (err) {
    console.error("[company-details] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
