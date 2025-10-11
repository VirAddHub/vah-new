import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

// Admin API Routes Handler
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const endpoint = searchParams.get('endpoint');

        // Handle different admin endpoints
        switch (endpoint) {
            case 'stats':
                return handleAdminStats();
            case 'health':
                return handleSystemHealth();
            case 'activity':
                return handleRecentActivity();
            case 'pending':
                return handlePendingActions();
            default:
                return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
        }
    } catch (_error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'refresh':
                return handleRefresh();
            case 'export':
                return handleExport(body);
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (_error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Admin Stats Handler
async function handleAdminStats() {
    try {
        // TODO: Replace with actual database queries
        // For now, return basic structure that can be populated with real data
        const stats = {
            totalUsers: 0,
            activeUsers: 0,
            pendingKyc: 0,
            suspendedUsers: 0,
            monthlyRevenue: 0,
            mailProcessed: 0,
            activeForwards: 0,
            userGrowth: 0,
            revenueGrowth: 0,
            mailGrowth: 0,
            forwardGrowth: 0
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
    }
}

// System Health Handler
async function handleSystemHealth() {
    const health = [
        { label: "Mail Processing API", status: "operational", uptime: "99.98%" },
        { label: "KYC Verification (Sumsub)", status: "operational", uptime: "99.95%" },
        { label: "Payment Gateway", status: "operational", uptime: "99.99%" },
        { label: "Database Performance", status: "warning", uptime: "97.82%" },
        { label: "Email Notifications", status: "operational", uptime: "99.87%" }
    ];

    return NextResponse.json(health);
}

// Recent Activity Handler
async function handleRecentActivity() {
    // Generate realistic recent activity data
    const now = new Date();
    const activities = [
        {
            id: 1,
            type: 'user_registration',
            icon: 'user-plus',
            iconColor: 'text-green-500',
            title: 'New user registration',
            description: 'jane.doe@example.com verified KYC',
            time: '2 minutes ago',
            timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString()
        },
        {
            id: 2,
            type: 'mail_processing',
            icon: 'mail',
            iconColor: 'text-blue-500',
            title: 'Mail batch processed',
            description: '47 items scanned and uploaded',
            time: '15 minutes ago',
            timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString()
        },
        {
            id: 3,
            type: 'forwarding_completed',
            icon: 'truck',
            iconColor: 'text-orange-500',
            title: 'Forwarding completed',
            description: 'Delivery #FR-2847 dispatched',
            time: '1 hour ago',
            timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString()
        },
        {
            id: 4,
            type: 'payment_processed',
            icon: 'credit-card',
            iconColor: 'text-purple-500',
            title: 'Payment processed',
            description: 'Invoice #INV-1045 paid (£39.99)',
            time: '2 hours ago',
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 5,
            type: 'kyc_approved',
            icon: 'shield-check',
            iconColor: 'text-green-500',
            title: 'KYC verification approved',
            description: 'john.smith@company.co.uk documents verified',
            time: '3 hours ago',
            timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 6,
            type: 'mail_forwarded',
            icon: 'send',
            iconColor: 'text-blue-500',
            title: 'Mail forwarded',
            description: 'HMRC correspondence sent to client',
            time: '4 hours ago',
            timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 7,
            type: 'subscription_renewed',
            icon: 'refresh-cw',
            iconColor: 'text-green-500',
            title: 'Subscription renewed',
            description: 'Annual plan renewed for acme-ltd@business.com',
            time: '6 hours ago',
            timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 8,
            type: 'support_ticket',
            icon: 'help-circle',
            iconColor: 'text-yellow-500',
            title: 'Support ticket created',
            description: 'New inquiry from sarah.wilson@startup.io',
            time: '8 hours ago',
            timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString()
        }
    ];

    return NextResponse.json(activities);
}

// Pending Actions Handler
async function handlePendingActions() {
    // TODO: Replace with actual database queries
    const pending = [
        { priority: "high", title: "KYC Reviews", count: 0, action: "Review Pending", actionId: "kyc_reviews" },
        { priority: "medium", title: "Mail Tagging", count: 0, action: "Tag Items", actionId: "mail_tagging" },
        { priority: "low", title: "User Inquiries", count: 0, action: "Respond", actionId: "user_inquiries" }
    ];

    return NextResponse.json(pending);
}

// Refresh Handler
async function handleRefresh() {
    return NextResponse.json({
        message: 'Data refreshed successfully',
        timestamp: new Date().toISOString()
    });
}

// Export Handler
async function handleExport(data: any) {
    const { type, filters } = data;

    // Mock export data - replace with actual data export logic
    const exportData = {
        type,
        filters,
        data: [],
        exportedAt: new Date().toISOString(),
        recordCount: 0
    };

    return NextResponse.json(exportData);
}
