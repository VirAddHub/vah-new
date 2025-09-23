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
    const status = searchParams.get('status') || 'all';
    const plan = searchParams.get('plan') || 'all';
    const kyc = searchParams.get('kyc') || 'all';
    const search = searchParams.get('search') || '';

    // Mock user data - replace with actual database query
    const users = [
        {
            id: 1,
            name: "Jane Doe",
            email: "jane@example.com",
            kyc: "approved",
            plan: "premium",
            status: "active",
            joined: "2023-08-15",
            lastLogin: "2 hours ago",
            mailCount: 23,
            totalSpent: "£299.88",
            companyName: "Doe Enterprises Ltd",
            address: "123 Business St, London",
            phone: "+44 20 7123 4567"
        },
        {
            id: 2,
            name: "John Smith",
            email: "john@example.com",
            kyc: "pending",
            plan: "basic",
            status: "active",
            joined: "2023-09-02",
            lastLogin: "1 day ago",
            mailCount: 8,
            totalSpent: "£39.99",
            companyName: "Smith Consulting",
            address: "456 High St, Manchester",
            phone: "+44 161 234 5678"
        },
        {
            id: 3,
            name: "Alice Johnson",
            email: "alice@example.com",
            kyc: "approved",
            plan: "professional",
            status: "suspended",
            joined: "2023-07-20",
            lastLogin: "5 days ago",
            mailCount: 156,
            totalSpent: "£1,247.50",
            companyName: "Johnson & Associates",
            address: "789 Corporate Ave, Birmingham",
            phone: "+44 121 345 6789"
        }
    ];

    // Apply filters
    let filteredUsers = users;

    if (status !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === status);
    }

    if (plan !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.plan === plan);
    }

    if (kyc !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.kyc === kyc);
    }

    if (search) {
        filteredUsers = filteredUsers.filter(user =>
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            (user.companyName && user.companyName.toLowerCase().includes(search.toLowerCase()))
        );
    }

    return NextResponse.json(filteredUsers);
}

// User Stats Handler
async function handleUserStats() {
    const stats = {
        total: 2847,
        active: 2634,
        pendingKyc: 156,
        suspended: 57,
        newThisMonth: 234,
        churnRate: 2.3
    };

    return NextResponse.json(stats);
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
