import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/update-bank`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[BFF billing update-bank] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create update bank link' },
      { status: 500 }
    );
  }
}