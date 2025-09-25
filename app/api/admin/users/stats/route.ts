import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // TODO: Replace with actual database queries
        // For now, return zero values as placeholders
        
        const stats = {
            total: 0,        // Total users (active + suspended + pending)
            active: 0,       // Active users
            suspended: 0,    // Suspended users
            pending: 0,      // Users with pending KYC
            deleted: 0       // Soft-deleted users
        };

        return NextResponse.json({
            ok: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return NextResponse.json({ 
            ok: false, 
            error: 'Failed to fetch user stats' 
        }, { status: 500 });
    }
}
