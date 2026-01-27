import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * POST /api/bff/business-owners/[id]/resend
 * Resend verification email to a business owner
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routePath = `/api/bff/business-owners/${params.id}/resend`;
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/business-owners/${params.id}/resend`;

    const response = await fetch(backendUrl, {
      method: 'POST',
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
        console.error(`[BFF business-owners resend] JSON parse failed:`, parseError);
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
      console.error(`[BFF business-owners resend] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF business-owners resend] Exception:`, error);
    return NextResponse.json(
      { ok: false, error: { code: 'BFF_EXCEPTION', message: error?.message || 'Failed to resend verification' } },
      { status: 500 }
    );
  }
}
