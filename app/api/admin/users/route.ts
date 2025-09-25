import { NextRequest, NextResponse } from 'next/server';

// Admin Users API Routes
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'stats':
                return handleUserStats();
            case 'export':
                return handleUserExport(request);
            default:
                return handleUserList(request);
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'bulk':
                return handleBulkUserAction(body);
            case 'add':
                return handleAddUser(body);
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// User List Handler
async function handleUserList(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const status = searchParams.get('status') || '';
    const plan = searchParams.get('plan') || '';
    const kyc = searchParams.get('kyc') || '';
    const search = searchParams.get('q') || '';

    try {
        // TODO: Replace with actual database query
        // For now, return empty array to show no fake data
        const users: any[] = [];

        // Apply pagination
        const offset = (page - 1) * pageSize;
        const paginatedUsers = users.slice(offset, offset + pageSize);

        return NextResponse.json({
            items: paginatedUsers,
            total: users.length,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(users.length / pageSize)
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// User Stats Handler
async function handleUserStats() {
    try {
        // TODO: Replace with actual database query
        const stats = {
            total: 0,
            active: 0,
            pendingKyc: 0,
            suspended: 0,
            newThisMonth: 0,
            churnRate: 0
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
    }
}

// User Export Handler
async function handleUserExport(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const plan = searchParams.get('plan') || 'all';
    const kyc = searchParams.get('kyc') || 'all';
    const search = searchParams.get('search') || '';

    // Mock export data
    const exportData = {
        filters: { status, plan, kyc, search },
        users: [],
        exportedAt: new Date().toISOString(),
        recordCount: 0
    };

    return NextResponse.json(exportData);
}

// Bulk User Action Handler
async function handleBulkUserAction(body: any) {
    const { action, userIds } = body;

    // Mock bulk action processing
    const result = {
        action,
        userIds,
        processed: userIds.length,
        success: true,
        message: `Successfully ${action}ed ${userIds.length} users`,
        timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
}

// Add User Handler
async function handleAddUser(body: any) {
    const { email, name, plan, isAdmin } = body;

    // Mock user creation
    const newUser = {
        id: Date.now(),
        email,
        name,
        plan: plan || 'basic',
        status: 'active',
        kyc: 'pending',
        is_admin: isAdmin || false,
        joined: new Date().toISOString().split('T')[0],
        lastLogin: 'Never',
        mailCount: 0,
        totalSpent: '£0.00'
    };

    return NextResponse.json({
        user: newUser,
        message: 'User created successfully',
        timestamp: new Date().toISOString()
    });
}
