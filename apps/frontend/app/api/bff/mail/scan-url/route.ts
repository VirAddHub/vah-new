import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mailItemId = searchParams.get('mailItemId');
    const disposition = searchParams.get('disposition') || 'inline';

    // Log at the very top to confirm handler is reached
    console.log('[scan-url] incoming', { 
      disposition, 
      mailItemId,
      hasCookie: !!request.headers.get('cookie'),
      hasAuthHeader: !!request.headers.get('authorization'),
    });

    if (!mailItemId) {
      return NextResponse.json({ error: 'mailItemId is required' }, { status: 400 });
    }

    const cookie = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';
    const backend = getBackendOrigin();

    // Forward the request to the backend
    const backendUrl = `${backend}/api/mail-items/${mailItemId}/download?disposition=${disposition}`;

    const headers: HeadersInit = {
      'User-Agent': 'VAH-Frontend-BFF/1.0',
    };

    // Forward cookies (primary auth method)
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    // Also forward Authorization header if present (for backward compatibility)
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(backendUrl, {
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[scan-url] backend error', { 
        disposition, 
        status: response.status, 
        mailItemId,
        errorText: errorText.substring(0, 200) // Truncate for logging
      });
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    // Get the PDF content
    const pdfBuffer = await response.arrayBuffer();

    // Log before returning to confirm success
    console.log('[scan-url] responding', { disposition, status: 200, mailItemId });

    // Return the PDF with proper headers
    // BOTH inline and attachment use the EXACT same code path - only Content-Disposition header differs
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

  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF mail scan-url] Server misconfigured:', error.message);
      return NextResponse.json(
        { error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF mail scan-url] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
