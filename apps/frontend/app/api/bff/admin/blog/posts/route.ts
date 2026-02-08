import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/bff/admin/blog/posts
 * List blog posts with pagination (admin only)
 */
export async function GET(request: NextRequest) {
  const routePath = '/api/bff/admin/blog/posts';
  let backendUrl = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    const searchParams = request.nextUrl.searchParams;
    
    // Forward query parameters
    const includeDrafts = searchParams.get('includeDrafts') || 'false';
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '20';
    
    backendUrl = `${backend}/api/admin/blog/posts?includeDrafts=${includeDrafts}&page=${page}&pageSize=${pageSize}`;

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

    console.log(`[BFF admin/blog/posts] Backend response: ${status} from ${backendUrl}`);

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF admin/blog/posts] JSON parse failed for ${status} response:`, parseError);
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
        { status: status >= 500 ? 502 : status }
      );
    }

    return NextResponse.json(json ?? { ok: true, items: [], total: 0, page: 1, pageSize: 20 }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF admin/blog/posts] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        {
          ok: false,
          error: 'Server misconfigured',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.error(`[BFF admin/blog/posts] Unexpected error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: "An error occurred while fetching blog posts"
      },
      { status: 500 }
    );
  }
}
