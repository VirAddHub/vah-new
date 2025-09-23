import { NextRequest, NextResponse } from 'next/server';

// Admin User Update API Route
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = params.id;
        const body = await request.json();
        const {
            firstName,
            lastName,
            email,
            phone,
            companyName,
            businessType,
            companyNumber,
            vatNumber,
            address,
            plan,
            role,
            is_admin,
            status,
            kyc_status
        } = body;

        // Validate required fields
        if (!firstName || !lastName || !email || !companyName) {
            return NextResponse.json({
                error: 'Missing required fields'
            }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({
                error: 'Invalid email format'
            }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await getUserById(userId);
        if (!existingUser) {
            return NextResponse.json({
                error: 'User not found'
            }, { status: 404 });
        }

        // Check if email is being changed and if it conflicts with another user
        if (email !== existingUser.email) {
            const emailConflict = await checkEmailConflict(email, userId);
            if (emailConflict) {
                return NextResponse.json({
                    error: 'Email already exists for another user'
                }, { status: 409 });
            }
        }

        // Update user data
        const updatedUserData = {
            ...existingUser,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`,
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || '',
            companyName: companyName.trim(),
            businessType: businessType?.trim() || '',
            companyNumber: companyNumber?.trim() || '',
            vatNumber: vatNumber?.trim() || '',
            address: address || {},
            plan: plan || 'basic',
            role: role || 'user',
            is_admin: is_admin || false,
            status: status || 'active',
            kyc_status: kyc_status || 'pending',
            updated_at: new Date().toISOString()
        };

        // Save updated user to database (mock implementation)
        const savedUser = await updateUser(userId, updatedUserData);

        // Log admin action
        await logAdminAction('user_updated', {
            userId: userId,
            email: savedUser.email,
            companyName: savedUser.companyName,
            plan: savedUser.plan,
            changes: body,
            updatedBy: 'admin'
        });

        // Return updated user data
        return NextResponse.json({
            user: savedUser,
            message: 'User updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('User update error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Get User by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = params.id;

        const user = await getUserById(userId);
        if (!user) {
            return NextResponse.json({
                error: 'User not found'
            }, { status: 404 });
        }

        return NextResponse.json({ user });

    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Delete User
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = params.id;

        const user = await getUserById(userId);
        if (!user) {
            return NextResponse.json({
                error: 'User not found'
            }, { status: 404 });
        }

        // Soft delete user (mark as deleted rather than removing from database)
        await softDeleteUser(userId);

        // Log admin action
        await logAdminAction('user_deleted', {
            userId: userId,
            email: user.email,
            companyName: user.companyName,
            deletedBy: 'admin'
        });

        return NextResponse.json({
            message: 'User deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('User deletion error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Helper functions
async function getUserById(userId: string): Promise<any> {
    // Mock database query - replace with actual database operation
    const mockUsers = [
        {
            id: 1,
            name: "Jane Doe",
            email: "jane@example.com",
            firstName: "Jane",
            lastName: "Doe",
            kyc: "approved",
            plan: "premium",
            status: "active",
            is_admin: false,
            joined: "2023-08-15",
            lastLogin: "2 hours ago",
            mailCount: 23,
            totalSpent: "£299.88",
            companyName: "Doe Enterprises Ltd",
            address: { line1: "123 Business St", city: "London", postcode: "SW1A 1AA" },
            phone: "+44 20 7123 4567"
        },
        {
            id: 2,
            name: "John Smith",
            email: "john@example.com",
            firstName: "John",
            lastName: "Smith",
            kyc: "pending",
            plan: "basic",
            status: "active",
            is_admin: false,
            joined: "2023-09-02",
            lastLogin: "1 day ago",
            mailCount: 8,
            totalSpent: "£39.99",
            companyName: "Smith Consulting",
            address: { line1: "456 High St", city: "Manchester", postcode: "M1 1AA" },
            phone: "+44 161 234 5678"
        },
        {
            id: 3,
            name: "Alice Johnson",
            email: "alice@example.com",
            firstName: "Alice",
            lastName: "Johnson",
            kyc: "approved",
            plan: "professional",
            status: "suspended",
            is_admin: false,
            joined: "2023-07-20",
            lastLogin: "5 days ago",
            mailCount: 156,
            totalSpent: "£1,247.50",
            companyName: "Johnson & Associates",
            address: { line1: "789 Corporate Ave", city: "Birmingham", postcode: "B1 1AA" },
            phone: "+44 121 345 6789"
        }
    ];

    return mockUsers.find(user => user.id.toString() === userId) || null;
}

async function checkEmailConflict(email: string, excludeUserId: string): Promise<boolean> {
    // Mock email conflict check - replace with actual database query
    const existingEmails = [
        'admin@virtualaddresshub.co.uk',
        'demo@virtualaddresshub.co.uk',
        'jane@example.com',
        'john@example.com',
        'alice@example.com'
    ];

    return existingEmails.includes(email.toLowerCase());
}

async function updateUser(userId: string, userData: any): Promise<any> {
    // Mock database update - replace with actual database operation
    console.log('Updating user in database:', userId, userData);

    // Simulate database update delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return userData;
}

async function softDeleteUser(userId: string): Promise<void> {
    // Mock soft delete - replace with actual database operation
    console.log('Soft deleting user:', userId);

    // Simulate database update delay
    await new Promise(resolve => setTimeout(resolve, 100));
}

async function logAdminAction(action: string, data: any): Promise<void> {
    try {
        // Mock audit logging - replace with actual audit log system
        console.log('Admin action logged:', {
            action,
            data,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1',
            userAgent: 'Admin Panel'
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}
