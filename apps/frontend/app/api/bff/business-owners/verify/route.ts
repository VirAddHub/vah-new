import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * GET /api/bff/business-owners/verify?token=...
 * Verify invite token (public, no auth required)
 */
export async function GET(request: NextRequest) {
  const routePath = '/api/bff/business-owners/verify';
  let backendUrl = '';
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/business-owners/verify?token=${encodeURIComponent(token || '')}`;

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

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF business-owners verify] JSON parse failed:`, parseError);
        return NextResponse.json(
          { ok: false, error: { code: 'BACKEND_NON_JSON', status, body: textPreview } },
          { status: 502 }
        );
      }
    }

    // Always return 200 for public endpoint (no enumeration)
    return NextResponse.json(json ?? { ok: true, data: { valid: false } }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF business-owners verify] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF business-owners verify] Exception:`, error);
    return NextResponse.json(
      { ok: true, data: { valid: false, message: 'Error verifying token' } },
      { status: 200 }
    );
  }
}

/**
 * POST /api/bff/business-owners/verify/start
 * Start identity verification (public, no auth required)
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/bff/business-owners/verify/start';
  let backendUrl = '';
  
  try {
    const body = await request.json();
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/business-owners/verify/start`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
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
        console.error(`[BFF business-owners verify/start] JSON parse failed:`, parseError);
        return NextResponse.json(
          { ok: false, error: { code: 'BACKEND_NON_JSON', status, body: textPreview } },
          { status: 502 }
        );
      }
    }

    // Always return 200 for public endpoint (no enumeration)
    return NextResponse.json(json ?? { ok: true, data: { started: false } }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF business-owners verify/start] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF business-owners verify/start] Exception:`, error);
    return NextResponse.json(
      { ok: true, data: { started: false, message: 'Error starting verification' } },
      { status: 200 }
    );
  }
}

