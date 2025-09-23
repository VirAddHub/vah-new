import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import bcrypt from 'bcrypt';

// Admin User Creation API Route
export async function POST(request: NextRequest) {
    try {
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
            send_welcome_email,
            password
        } = body;

        // Validate required fields
        if (!firstName || !lastName || !email || !companyName || !password) {
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

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json({
                error: 'Password must be at least 8 characters long'
            }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return NextResponse.json({
                error: 'User with this email already exists'
            }, { status: 409 });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user in database
        const result = await db.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone,
        company_name, business_type, company_number, vat_number,
        address_line1, address_line2, city, postcode, country,
        plan, role, is_admin, kyc_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
            email.trim().toLowerCase(),
            passwordHash,
            firstName.trim(),
            lastName.trim(),
            phone?.trim() || null,
            companyName.trim(),
            businessType?.trim() || null,
            companyNumber?.trim() || null,
            vatNumber?.trim() || null,
            address?.line1?.trim() || null,
            address?.line2?.trim() || null,
            address?.city?.trim() || null,
            address?.postcode?.trim() || null,
            address?.country || 'United Kingdom',
            plan || 'basic',
            role || 'user',
            is_admin || false,
            'pending',
            'active'
        ]);

        const savedUser = result.rows[0];

        // Send welcome email if requested
        if (send_welcome_email) {
            await sendWelcomeEmail(savedUser);
        }

        // Log admin action
        await db.query(`
      INSERT INTO audit_logs (user_id, action, data, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [
            savedUser.id,
            'user_created',
            JSON.stringify({
                email: savedUser.email,
                companyName: savedUser.company_name,
                plan: savedUser.plan,
                createdBy: 'admin'
            }),
            request.headers.get('x-forwarded-for') || '127.0.0.1',
            request.headers.get('user-agent') || 'Admin Panel'
        ]);

        // Return user data (without password hash)
        const { password_hash, ...userResponse } = savedUser;

        return NextResponse.json({
            user: userResponse,
            message: 'User created successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('User creation error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Helper functions

async function sendWelcomeEmail(user: any): Promise<void> {
    try {
        const postmark = require('postmark');
        const client = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

        await client.sendEmail({
            From: process.env.POSTMARK_FROM_EMAIL || 'noreply@virtualaddresshub.co.uk',
            To: user.email,
            Subject: 'Welcome to VirtualAddressHub',
            HtmlBody: `
        <h1>Welcome to VirtualAddressHub!</h1>
        <p>Dear ${user.first_name} ${user.last_name},</p>
        <p>Welcome to VirtualAddressHub! Your account has been successfully created.</p>
        <p><strong>Account Details:</strong></p>
        <ul>
          <li>Company: ${user.company_name}</li>
          <li>Plan: ${user.plan}</li>
          <li>Email: ${user.email}</li>
        </ul>
        <p>You can now log in to your account and start using our services.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Your Account</a></p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The VirtualAddressHub Team</p>
      `,
            TextBody: `
        Welcome to VirtualAddressHub!
        
        Dear ${user.first_name} ${user.last_name},
        
        Welcome to VirtualAddressHub! Your account has been successfully created.
        
        Account Details:
        - Company: ${user.company_name}
        - Plan: ${user.plan}
        - Email: ${user.email}
        
        You can now log in to your account and start using our services.
        Login URL: ${process.env.NEXT_PUBLIC_BASE_URL}/login
        
        If you have any questions, please don't hesitate to contact our support team.
        
        Best regards,
        The VirtualAddressHub Team
      `
        });

        console.log(`Welcome email sent to: ${user.email}`);

    } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't throw error - user creation should still succeed
    }
}

