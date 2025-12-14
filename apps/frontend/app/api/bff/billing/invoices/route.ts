import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const { searchParams } = new URL(request.url);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/invoices?${searchParams}`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader || '',
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

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[BFF billing invoices] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}