import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

// Admin Password Reset API Route
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate admin email format
        if (!email.includes('admin') && !email.includes('@virtualaddresshub.co.uk')) {
            return NextResponse.json({
                error: 'Invalid admin email address'
            }, { status: 400 });
        }

        // Mock password reset process
        // In a real implementation, you would:
        // 1. Verify the email exists in admin users
        // 2. Generate a secure reset token
        // 3. Send email with reset link
        // 4. Store token with expiration

        const resetToken = generateResetToken();
        const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/reset-password?token=${resetToken}`;

        // Mock email sending
        const emailSent = await sendPasswordResetEmail(email, resetLink);

        if (emailSent) {
            return NextResponse.json({
                message: 'Password reset link sent to your email',
                email: email,
                timestamp: new Date().toISOString()
            });
        } else {
            return NextResponse.json({
                error: 'Failed to send password reset email'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Generate secure reset token
function generateResetToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Mock email sending function
async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    try {
        // In a real implementation, you would use your email service (Postmark, SendGrid, etc.)
        console.log(`Sending password reset email to: ${email}`);
        console.log(`Reset link: ${resetLink}`);

        // Mock email service call
        // await emailService.send({
        //   to: email,
        //   subject: 'Admin Password Reset - VirtualAddressHub',
        //   template: 'admin-password-reset',
        //   data: { resetLink }
        // });

        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
}
