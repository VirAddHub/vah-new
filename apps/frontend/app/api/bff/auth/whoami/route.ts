import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/bff/auth/whoami
 * Proxy whoami request to backend
 */
export async function GET(request: NextRequest) {
  const routePath = '/api/bff/auth/whoami';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/auth/whoami`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      cache: 'no-store', // Never cache whoami requests
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.log(`[BFF auth/whoami] Backend response: ${status} from ${backendUrl}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF auth/whoami] JSON parse failed for ${status} response:`, parseError);
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
          error: json?.error || json?.message || 'Authentication failed',
          details: json ?? textPreview 
        }, 
        { status: status }
      );
    }

    // Backend is 2xx and JSON parsed successfully
    return NextResponse.json(json ?? { ok: true, data: {} }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF auth/whoami] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF auth/whoami] Exception in route ${routePath}:`, error);
    console.error(`[BFF auth/whoami] Backend URL was: ${backendUrl}`);
    console.error(`[BFF auth/whoami] Error stack:`, error?.stack);
    return NextResponse.json(
      { 
        ok: false, 
        error: { 
          code: 'BFF_EXCEPTION', 
          message: error?.message || 'Failed to check authentication',
          route: routePath 
        }
      },
      { status: 500 }
    );
  }
}

