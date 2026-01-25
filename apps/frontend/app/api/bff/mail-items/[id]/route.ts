import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/bff/mail-items/:id
 * Update mail item (e.g., tag)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { ok: false, error: 'invalid_mail_item_id' },
        { status: 400 }
      );
    }

    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();

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
        console.error('[BFF mail-items PATCH] Failed to parse CSRF token response:', e);
      }
    }

    const response = await fetch(`${backend}/api/mail-items/${id}`, {
      method: 'PATCH',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

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
        { ok: false, error: data?.error || 'Failed to update mail item', status: response.status, details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF mail-items PATCH] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF mail-items PATCH] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update mail item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bff/mail-items/:id
 * Archive mail item (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { ok: false, error: 'invalid_mail_item_id' },
        { status: 400 }
      );
    }

    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    // Fetch CSRF token before making DELETE request
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
        console.error('[BFF mail-items DELETE] Failed to parse CSRF token response:', e);
      }
    }

    const response = await fetch(`${backend}/api/mail-items/${id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      cache: 'no-store',
    });

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
        { ok: false, error: data?.error || 'Failed to archive mail item', status: response.status, details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF mail-items DELETE] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF mail-items DELETE] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to archive mail item' },
      { status: 500 }
    );
  }
}
