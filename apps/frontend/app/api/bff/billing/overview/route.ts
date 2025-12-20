import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  const routePath = '/api/bff/billing/overview';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/billing/overview`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.error(`[BFF billing overview] Backend response: ${status} from ${backendUrl}, body preview: ${textPreview}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF billing overview] JSON parse failed for ${status} response:`, parseError);
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
    return NextResponse.json(json ?? { raw: textPreview }, { status: 200 });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF billing overview] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF billing overview] Exception in route ${routePath}:`, error);
    console.error(`[BFF billing overview] Backend URL was: ${backendUrl}`);
    console.error(`[BFF billing overview] Error stack:`, error?.stack);
    return NextResponse.json(
      { 
        ok: false, 
        error: { 
          code: 'BFF_EXCEPTION', 
          message: error?.message,
          route: routePath 
        }
      },
      { status: 500 }
    );
  }
}