import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * POST /api/bff/profile/email-change/resend
 * Resend email change confirmation email
 * 
 * This is a public endpoint (no auth required) that proxies to the backend
 * to resend email change confirmation emails.
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/bff/profile/email-change/resend';
  let backendUrl = '';
  
  try {
    const body = await request.json();
    const { token } = body;

    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/profile/email-change/resend`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.error(`[BFF email-change/resend] Backend response: ${status} from ${backendUrl}, body preview: ${textPreview}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF email-change/resend] JSON parse failed for ${status} response:`, parseError);
        return NextResponse.json(
          { 
            ok: false, 
            error: { 
              code: 'BACKEND_NON_JSON', 
              status, 
              body: textPreview 
            } 
          }, 
          { status: 502 }
        );
      }
    }

    // If backend status is not 2xx, return backend error
    if (status < 200 || status >= 300) {
      return NextResponse.json(
        { 
          ok: false, 
          error: { 
            code: 'BACKEND_ERROR', 
            status, 
            body: json ?? textPreview 
          } 
        }, 
        { status: 502 }
      );
    }

    // Backend is 2xx and JSON parsed successfully
    // Always return 200 with ok:true (no user enumeration)
    return NextResponse.json(json ?? { ok: true, data: { sent: true } }, { status: 200 });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF email-change/resend] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF email-change/resend] Exception in route ${routePath}:`, error);
    console.error(`[BFF email-change/resend] Backend URL was: ${backendUrl}`);
    console.error(`[BFF email-change/resend] Error stack:`, error?.stack);
    // Return generic success (no user enumeration)
    return NextResponse.json(
      { 
        ok: true, 
        data: { 
          sent: true
        }
      },
      { status: 200 }
    );
  }
}

