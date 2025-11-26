import { NextRequest, NextResponse } from "next/server";

const COMPANIES_HOUSE_BASE =
  "https://api.company-information.service.gov.uk/search/companies";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") || "").trim();

    // If query too short, just return empty list
    if (query.length < 2) {
      return NextResponse.json(
        { ok: true, businesses: [], isLastBatch: true },
        { status: 200 }
      );
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      console.error("Missing COMPANIES_HOUSE_API_KEY env var");
      return NextResponse.json(
        { ok: false, error: "missing_api_key" },
        { status: 500 }
      );
    }

    const url = `${COMPANIES_HOUSE_BASE}?q=${encodeURIComponent(
      query
    )}&items_per_page=10`;

    const chRes = await fetch(url, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${apiKey}:`, "utf8").toString("base64"),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!chRes.ok) {
      console.error("Companies House error", chRes.status, await chRes.text());
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status: 502 }
      );
    }

    const json: any = await chRes.json();
    const items = Array.isArray(json.items) ? json.items : [];

    const businesses = items.map((i: any) => ({
      title: i.title ?? "",
      regNumber: i.company_number ?? "",
      identifier: i.company_number ?? "",
      status: i.company_status ?? undefined,
      addressSnippet: i.address_snippet ?? undefined,
    }));

    const isLastBatch = items.length < 10;

    return NextResponse.json(
      { ok: true, businesses, isLastBatch },
      { status: 200 }
    );
  } catch (err) {
    console.error("company-search route error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
