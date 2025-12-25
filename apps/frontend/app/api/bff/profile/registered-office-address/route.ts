import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';
import { REGISTERED_OFFICE_ADDRESS, VAH_ADDRESS_LINES } from '@/lib/config/address';

/**
 * BFF endpoint that proxies to backend registered office address endpoint
 * Returns the registered office address from config (same for all users)
 */
export async function GET(request: NextRequest) {
    const routePath = '/api/bff/profile/registered-office-address';
    let backendBase = '';

    try {
        const cookie = request.headers.get('cookie') || '';
        const backend = getBackendOrigin();
        backendBase = backend;

        // Fetch from backend endpoint
        const response = await fetch(`${backend}/api/profile/registered-office-address`, {
            headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
        });

        const raw = await response.text();
        let data: any;
        try {
            data = JSON.parse(raw);
        } catch {
            return NextResponse.json(
                { ok: false, error: 'invalid_response', details: raw.substring(0, 300) },
                { status: 500 }
            );
        }

        // If KYC is required, we still return the address for display purposes
        // The backend endpoint requires KYC, but for account page display we can show it anyway
        if (!response.ok && data.error === 'KYC_REQUIRED') {
            // For display purposes, return the address even if KYC isn't approved
            // We'll fetch it directly from the config
            return NextResponse.json({
                ok: true,
                data: {
                    line1: REGISTERED_OFFICE_ADDRESS.line1,
                    line2: REGISTERED_OFFICE_ADDRESS.line2,
                    city: REGISTERED_OFFICE_ADDRESS.city,
                    postcode: REGISTERED_OFFICE_ADDRESS.postcode,
                    country: REGISTERED_OFFICE_ADDRESS.country,
                    formatted: VAH_ADDRESS_LINES.join('\n'),
                },
            });
        }

        if (!response.ok) {
            return NextResponse.json(
                { ok: false, error: data.error || 'unknown_error', details: data },
                { status: response.status }
            );
        }

        // Format the address for display
        if (data.ok && data.data) {
            const addr = data.data;
            const formatted = [
                addr.line1,
                addr.line2,
                `${addr.city} ${addr.postcode}`,
                addr.country,
            ].filter(Boolean).join('\n');

            return NextResponse.json({
                ok: true,
                data: {
                    ...addr,
                    formatted,
                },
            });
        }

        return NextResponse.json(data, { status: response.status });
    } catch (error: unknown) {
        if (isBackendOriginConfigError(error)) {
            console.error(`[${routePath}] Server misconfigured:`, error);
            return NextResponse.json(
                { ok: false, error: 'server_misconfigured', details: String(error) },
                { status: 500 }
            );
        }

        console.error(`[${routePath}] error:`, error);
        return NextResponse.json(
            { ok: false, error: 'backend_connection_failed' },
            { status: 502 }
        );
    }
}

