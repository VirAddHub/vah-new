import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  const routePath = '/api/bff/billing/invoices';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const { searchParams } = new URL(request.url);
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/billing/invoices?${searchParams}`;

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
    console.error(`[BFF billing invoices] Backend response: ${status} from ${backendUrl}, body preview: ${textPreview}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF billing invoices] JSON parse failed for ${status} response:`, parseError);
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

    // Normalise invoice PDF URL to a same-origin BFF download endpoint
    // so the browser can download with the user's cookies.
    if (json?.ok && json?.data?.items && Array.isArray(json.data.items)) {
      json.data.items = json.data.items.map((inv: any) => {
        const hasPdf = Boolean(inv?.pdf_url || inv?.pdf_path);
        return {
          ...inv,
          pdf_url: hasPdf ? `/api/bff/billing/invoices/${inv.id}/download` : null,
        };
      });
    }

    // Backend is 2xx and JSON parsed successfully
    return NextResponse.json(json ?? { raw: textPreview }, { status: 200 });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF billing invoices] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF billing invoices] Exception in route ${routePath}:`, error);
    console.error(`[BFF billing invoices] Backend URL was: ${backendUrl}`);
    console.error(`[BFF billing invoices] Error stack:`, error?.stack);
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