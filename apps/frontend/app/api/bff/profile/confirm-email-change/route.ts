import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * GET /api/bff/profile/confirm-email-change
 * Confirm email change using token from verification email
 * 
 * This is a public endpoint (no auth required) that proxies to the backend
 * to confirm email changes via token verification.
 */
export async function GET(request: NextRequest) {
  const routePath = '/api/bff/profile/confirm-email-change';
  let backendUrl = '';
  
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { 
          ok: true, 
          data: { 
            changed: false,
            message: 'This confirmation link is invalid.'
          } 
        },
        { status: 200 }
      );
    }

    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/profile/confirm-email-change?token=${encodeURIComponent(token)}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.error(`[BFF confirm-email-change] Backend response: ${status} from ${backendUrl}, body preview: ${textPreview}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF confirm-email-change] JSON parse failed for ${status} response:`, parseError);
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
    return NextResponse.json(json ?? { ok: true, data: { changed: false } }, { status: 200 });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF confirm-email-change] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF confirm-email-change] Exception in route ${routePath}:`, error);
    console.error(`[BFF confirm-email-change] Backend URL was: ${backendUrl}`);
    console.error(`[BFF confirm-email-change] Error stack:`, error?.stack);
    // Return generic error (no user enumeration)
    return NextResponse.json(
      { 
        ok: true, 
        data: { 
          changed: false,
          message: 'This confirmation link is invalid or has expired.'
        }
      },
      { status: 200 }
    );
  }
}

