import { NextRequest, NextResponse } from "next/server";

const CH_COMPANY_DETAIL_BASE =
  "https://api.company-information.service.gov.uk/company";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = (searchParams.get("identifier") || "").trim();

    if (!identifier) {
      return NextResponse.json(
        { ok: false, error: "missing_identifier" },
        { status: 400 }
      );
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      console.error("Missing COMPANIES_HOUSE_API_KEY");
      return NextResponse.json(
        { ok: false, error: "missing_api_key" },
        { status: 500 }
      );
    }

    const url = `${CH_COMPANY_DETAIL_BASE}/${identifier}`;
    const res = await fetch(url, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${apiKey}:`, "utf8").toString("base64"),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("CH detail error", res.status, await res.text());
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status: 502 }
      );
    }

    const json: any = await res.json();

    return NextResponse.json(
      {
        ok: true,
        name: json.company_name ?? "",
        companyNumber: json.company_number ?? "",
        type: json.type ?? "",
        status: json.company_status ?? "",
        dateOfIncorporation: json.date_of_creation ?? "",
        registeredOfficeAddress: json.registered_office_address ?? null,
        sicCodes: json.sic_codes ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("company-details error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
