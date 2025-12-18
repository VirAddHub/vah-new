import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const { searchParams } = new URL(request.url);
    const backend = getBackendOrigin();

    const response = await fetch(`${backend}/api/billing/invoices?${searchParams}`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Normalise invoice PDF URL to a same-origin BFF download endpoint
    // so the browser can download with the user's cookies.
    if (data?.ok && data?.data?.items && Array.isArray(data.data.items)) {
      data.data.items = data.data.items.map((inv: any) => {
        const hasPdf = Boolean(inv?.pdf_url || inv?.pdf_path);
        return {
          ...inv,
          pdf_url: hasPdf ? `/api/bff/billing/invoices/${inv.id}/download` : null,
        };
      });
    }

    if (response.ok) {
      return NextResponse.json(data, { status: response.status });
    } else {
      return NextResponse.json(
        { ok: false, error: data.error || 'Failed to fetch invoices', details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF billing invoices] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: BACKEND_API_ORIGIN is not set or invalid' },
        { status: 500 }
      );
    }
    console.error('[BFF billing invoices] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}