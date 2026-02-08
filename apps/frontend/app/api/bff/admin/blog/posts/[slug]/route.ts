import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/bff/admin/blog/posts/[slug]
 * Get a specific blog post by slug (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const routePath = `/api/bff/admin/blog/posts/${slug}`;
  let backendUrl = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/admin/blog/posts/${encodeURIComponent(slug)}`;

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

    console.log(`[BFF admin/blog/posts/${slug}] Backend response: ${status} from ${backendUrl}`);

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF admin/blog/posts/${slug}] JSON parse failed for ${status} response:`, parseError);
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

    return NextResponse.json(json ?? { ok: true, data: {} }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF admin/blog/posts/${slug}] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        {
          ok: false,
          error: 'Server misconfigured',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.error(`[BFF admin/blog/posts/${slug}] Unexpected error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: "An error occurred while fetching blog post"
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bff/admin/blog/posts/[slug]
 * Update a blog post (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const routePath = `/api/bff/admin/blog/posts/${slug}`;
  let backendUrl = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/admin/blog/posts/${encodeURIComponent(slug)}`;

    const response = await fetch(backendUrl, {
      method: 'PUT',
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

    console.log(`[BFF admin/blog/posts/${slug}] Backend response: ${status} from ${backendUrl}`);

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF admin/blog/posts/${slug}] JSON parse failed for ${status} response:`, parseError);
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

    return NextResponse.json(json ?? { ok: true, data: {} }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF admin/blog/posts/${slug}] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        {
          ok: false,
          error: 'Server misconfigured',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.error(`[BFF admin/blog/posts/${slug}] Unexpected error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: "An error occurred while updating blog post"
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bff/admin/blog/posts/[slug]
 * Update a blog post (admin only) - alias for PUT
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const routePath = `/api/bff/admin/blog/posts/${slug}`;
  let backendUrl = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/admin/blog/posts/${encodeURIComponent(slug)}`;

    const response = await fetch(backendUrl, {
      method: 'PUT',
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

    console.log(`[BFF admin/blog/posts/${slug}] Backend response: ${status} from ${backendUrl}`);

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF admin/blog/posts/${slug}] JSON parse failed for ${status} response:`, parseError);
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

    return NextResponse.json(json ?? { ok: true, data: {} }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF admin/blog/posts/${slug}] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        {
          ok: false,
          error: 'Server misconfigured',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.error(`[BFF admin/blog/posts/${slug}] Unexpected error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: "An error occurred while updating blog post"
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bff/admin/blog/posts/[slug]
 * Delete a blog post (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const routePath = `/api/bff/admin/blog/posts/${slug}`;
  let backendUrl = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/admin/blog/posts/${encodeURIComponent(slug)}`;

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    console.log(`[BFF admin/blog/posts/${slug}] Backend response: ${status} from ${backendUrl}`);

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF admin/blog/posts/${slug}] JSON parse failed for ${status} response:`, parseError);
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

    return NextResponse.json(json ?? { ok: true, data: {} }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF admin/blog/posts/${slug}] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        {
          ok: false,
          error: 'Server misconfigured',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.error(`[BFF admin/blog/posts/${slug}] Unexpected error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: "An error occurred while deleting blog post"
      },
      { status: 500 }
    );
  }
}
