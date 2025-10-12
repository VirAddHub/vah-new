import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mailItemId = searchParams.get('mailItemId');
    const disposition = searchParams.get('disposition') || 'inline';

    if (!mailItemId) {
      return NextResponse.json({ error: 'mailItemId is required' }, { status: 400 });
    }

    // Get the JWT token from the Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Forward the request to the backend
    const backendUrl = `${API_BASE}/api/mail-items/${mailItemId}/download?disposition=${disposition}`;

    const response = await fetch(backendUrl, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'User-Agent': 'VAH-Frontend-BFF/1.0',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    // Get the PDF content
    const pdfBuffer = await response.arrayBuffer();

    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="mail-item-${mailItemId}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('[BFF mail scan-url] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
