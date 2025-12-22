import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache PDF downloads
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Handle Next.js 13+ App Router params (may be Promise)
  const resolvedParams = params instanceof Promise ? await params : params;
  const id = resolvedParams.id;
  
  // Validate invoice ID
  if (!id || id === 'undefined' || id === 'null') {
    console.error('[BFF PDF DOWNLOAD] Invalid invoice ID', { id, url: request.url });
    return NextResponse.json(
      { ok: false, error: 'Invalid invoice ID' },
      { status: 400 }
    );
  }

  console.log('[BFF PDF DOWNLOAD] Request received', {
    invoiceId: id,
    url: request.url,
    timestamp: new Date().toISOString(),
  });

  try {
    const cookie = request.headers.get("cookie") || "";
    const authHeader = request.headers.get("authorization") || "";
    const backend = getBackendOrigin();

    console.log('[BFF PDF DOWNLOAD] Proxying to backend', {
      invoiceId: id,
      backendUrl: `${backend}/api/billing/invoices/${encodeURIComponent(id)}/download`,
      hasCookie: !!cookie,
      hasAuthHeader: !!authHeader,
    });

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

    console.log('[BFF PDF DOWNLOAD] Backend response', {
      invoiceId: id,
      status: resp.status,
      statusText: resp.statusText,
      contentType: resp.headers.get('content-type'),
      contentLength: resp.headers.get('content-length'),
    });

    if (resp.ok) {
      const headers = new Headers(resp.headers);
      // Ensure the browser treats it as a download if backend didn't set it
      if (!headers.get("content-type")) headers.set("content-type", "application/pdf");

      console.log('[BFF PDF DOWNLOAD] Returning PDF response', {
        invoiceId: id,
        status: resp.status,
        contentType: headers.get('content-type'),
      });

      return new NextResponse(resp.body, { status: resp.status, headers });
    } else {
      // For non-2xx responses, try to parse JSON error
      const errorText = await resp.text();
      console.error('[BFF PDF DOWNLOAD] Backend error response', {
        invoiceId: id,
        status: resp.status,
        errorText: errorText.substring(0, 200), // First 200 chars
      });

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to download invoice' };
      }

      return NextResponse.json(
        { ok: false, error: errorData.error || 'Failed to download invoice', details: errorData },
        { status: resp.status }
      );
    }
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error("[BFF PDF DOWNLOAD] Server misconfigured", {
        invoiceId: id,
        error: error.message,
      });
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error("[BFF PDF DOWNLOAD] Fatal error", {
      invoiceId: id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ ok: false, error: "Failed to download invoice" }, { status: 500 });
  }
}

