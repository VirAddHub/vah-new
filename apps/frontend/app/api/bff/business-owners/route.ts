import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * GET /api/bff/business-owners
 * Get all business owners for the authenticated user
 */
export async function GET(request: NextRequest) {
  const routePath = '/api/bff/business-owners';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/business-owners`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF business-owners] JSON parse failed:`, parseError);
        return NextResponse.json(
          { ok: false, error: { code: 'BACKEND_NON_JSON', status, body: textPreview } },
          { status: 502 }
        );
      }
    }

    if (status < 200 || status >= 300) {
      return NextResponse.json(
        { ok: false, error: { code: 'BACKEND_ERROR', status, body: json ?? textPreview } },
        { status: 502 }
      );
    }

    return NextResponse.json(json ?? { ok: true, data: [] }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF business-owners] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF business-owners] Exception:`, error);
    return NextResponse.json(
      { ok: false, error: { code: 'BFF_EXCEPTION', message: error?.message || 'Failed to fetch business owners' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bff/business-owners
 * Add a new business owner
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/bff/business-owners';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/business-owners`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF business-owners POST] JSON parse failed:`, parseError);
        return NextResponse.json(
          { ok: false, error: { code: 'BACKEND_NON_JSON', status, body: textPreview } },
          { status: 502 }
        );
      }
    }

    if (status < 200 || status >= 300) {
      return NextResponse.json(
        { ok: false, error: { code: 'BACKEND_ERROR', status, body: json ?? textPreview } },
        { status: 502 }
      );
    }

    return NextResponse.json(json ?? { ok: true, data: {} }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF business-owners POST] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF business-owners POST] Exception:`, error);
    return NextResponse.json(
      { ok: false, error: { code: 'BFF_EXCEPTION', message: error?.message || 'Failed to add business owner' } },
      { status: 500 }
    );
  }
}

