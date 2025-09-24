import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, createSessionResponse } from '@/lib/server/session';

export async function GET(request: NextRequest) {
    try {
        // Get session data from cookies (server-safe)
        const session = getSessionFromCookies();

        // Check if user is authenticated
        if (!session.authenticated) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Check if user data exists
        if (!session.user) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        // Return user data with role information
        return NextResponse.json(createSessionResponse(session));
    } catch (error) {
        console.error('Whoami error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
