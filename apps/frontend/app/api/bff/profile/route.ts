import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  const routePath = '/api/bff/profile';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/profile`;

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
    console.error(`[BFF profile] Backend response: ${status} from ${backendUrl}, body preview: ${textPreview}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF profile] JSON parse failed for ${status} response:`, parseError);
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
      console.error(`[BFF profile] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF profile] Exception in route ${routePath}:`, error);
    console.error(`[BFF profile] Backend URL was: ${backendUrl}`);
    console.error(`[BFF profile] Error stack:`, error?.stack);
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

export async function PATCH(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();

    // If email or phone is being updated, use the contact endpoint (email requires verification)
    if (body.email !== undefined || body.phone !== undefined) {
      const contactResponse = await fetch(`${backend}/api/profile/contact`, {
        method: 'PATCH',
        headers: {
          'Cookie': cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: body.email,
          phone: body.phone,
        }),
      });

      const raw = await contactResponse.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { raw: raw.substring(0, 300) };
      }

      if (contactResponse.ok) {
        return NextResponse.json(data, { status: contactResponse.status });
      } else {
        return NextResponse.json(
          { ok: false, error: data?.error || 'Failed to update contact details', status: contactResponse.status, details: data },
          { status: contactResponse.status }
        );
      }
    }

    // For other profile fields, use the regular profile endpoint
    const response = await fetch(`${backend}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Read response as text first
    const raw = await response.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw: raw.substring(0, 300) };
    }

    if (response.ok) {
      return NextResponse.json(data, { status: response.status });
    } else {
      return NextResponse.json(
        { ok: false, error: data?.error || 'Failed to update profile', status: response.status, details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF profile PATCH] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF profile PATCH] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
