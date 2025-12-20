import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    const response = await fetch(`${backend}/api/profile`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
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
        { ok: false, error: data?.error || 'Failed to fetch profile', status: response.status, details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF profile] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF profile] error:', error);
    console.error('[BFF profile] error stack:', error?.stack);
    console.error('[BFF profile] error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause,
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Failed to fetch profile',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
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
