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
    // TODO: Replace with actual database query
    // For now, return null to show no fake data
    return null;
}

async function checkEmailConflict(email: string, excludeUserId: string): Promise<boolean> {
    // TODO: Replace with actual database query
    // For now, return false to show no fake data
    return false;
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
