import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';
import { bffSafeLogError } from '@/lib/server/bffSafeLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE = '/api/bff/billing/invoices/[id]/download';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
    bffSafeLogError(ROUTE, 'invalid_invoice_id', request);
    return NextResponse.json(
      { ok: false, error: 'Invalid invoice ID' },
      { status: 400 }
    );
  }

  try {
    const cookie = request.headers.get("cookie") || "";
    const authHeader = request.headers.get("authorization") || "";
    const backend = getBackendOrigin();

    const backendUrl = `${backend}/api/billing/invoices/${encodeURIComponent(id)}/download`;
    const headers: Record<string, string> = {};

    if (cookie) {
      headers['Cookie'] = cookie;
    }
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const resp = await fetch(backendUrl, {
      method: "GET",
      headers,
    });

    if (resp.ok) {
      const outHeaders = new Headers(resp.headers);
      if (!outHeaders.get("content-type")) outHeaders.set("content-type", "application/pdf");

      return new NextResponse(resp.body, { status: resp.status, headers: outHeaders });
    }

    const errorText = await resp.text();
    bffSafeLogError(ROUTE, 'backend_upstream_error', request, {
      upstreamStatus: resp.status,
      resourceId: id,
    });

    let errorData: { error?: string; [k: string]: unknown };
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || 'Failed to download invoice' };
    }

    return NextResponse.json(
      {
        ok: false,
        error: errorData.error || 'Failed to download invoice',
        details: errorData,
      },
      { status: resp.status }
    );
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      bffSafeLogError(ROUTE, 'misconfigured_backend_origin', request, {
        resourceId: id,
      });
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    bffSafeLogError(ROUTE, 'bff_exception', request, { resourceId: id });
    return NextResponse.json({ ok: false, error: "Failed to download invoice" }, { status: 500 });
  }
}
