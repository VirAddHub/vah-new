import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/bff/profile/contact
 * Update contact details (email and/or phone)
 * 
 * Email changes require verification and will trigger the email-change flow.
 * Phone changes are immediate.
 */
export async function PATCH(request: NextRequest) {
  const routePath = '/api/bff/profile/contact';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/profile/contact`;

    // Fetch CSRF token before making PATCH request
    const csrfResponse = await fetch(`${backend}/api/csrf`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
      credentials: 'include',
      cache: 'no-store',
    });

    let csrfToken: string | null = null;
    if (csrfResponse.ok) {
      try {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken || null;
      } catch (e) {
        console.error('[BFF profile/contact PATCH] Failed to parse CSRF token response:', e);
      }
    }

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.error(`[BFF profile/contact] Backend response: ${status} from ${backendUrl}, body preview: ${textPreview}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF profile/contact] JSON parse failed for ${status} response:`, parseError);
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
    return NextResponse.json(json ?? { ok: true, data: {} }, { status: 200 });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF profile/contact] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF profile/contact] Exception in route ${routePath}:`, error);
    console.error(`[BFF profile/contact] Backend URL was: ${backendUrl}`);
    console.error(`[BFF profile/contact] Error stack:`, error?.stack);
    return NextResponse.json(
      { 
        ok: false, 
        error: { 
          code: 'BFF_EXCEPTION', 
          message: error?.message || 'Failed to update contact details',
          route: routePath 
        }
      },
      { status: 500 }
    );
  }
}

