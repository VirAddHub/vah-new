import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * GET /api/bff/profile/certificate
 * Proxy to backend certificate endpoint
 * Returns PDF file for download
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    const response = await fetch(`${backend}/api/profile/certificate`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If it's a PDF error, try to get error JSON
      if (response.headers.get('content-type')?.includes('application/json')) {
        const errorData = await response.json();
        return NextResponse.json(
          { ok: false, error: errorData?.error || 'Failed to generate certificate', details: errorData },
          { status: response.status }
        );
      }
      // Otherwise return generic error
      return NextResponse.json(
        { ok: false, error: 'Failed to generate certificate', status: response.status },
        { status: response.status }
      );
    }

    // If successful, return the PDF blob
    const blob = await response.blob();
    
    // Return PDF with proper headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="certificate.pdf"',
      },
    });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF profile/certificate] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF profile/certificate] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}

