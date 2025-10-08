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
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[BFF billing invoices] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}