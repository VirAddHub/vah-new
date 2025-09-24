import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib';

export async function GET(request: NextRequest) {
    try {
        // Check if user is authenticated
        if (!authManager.isAuthenticated()) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get user data from auth manager
        const user = authManager.getUser();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        // Return user data with role information
        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.is_admin ? 'admin' : 'user',
                is_admin: user.is_admin,
                kyc_status: user.kyc_status,
                plan: user.plan,
                created_at: user.created_at,
                last_login: user.last_login
            },
            role: user.is_admin ? 'admin' : 'user'
        });
    } catch (error) {
        console.error('Whoami error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
