import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

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
            await sendWelcomeEmail(savedUser as NewUser);
        }

        // Log admin action
        await db.query(`
      INSERT INTO audit_logs (user_id, action, data, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [
            (savedUser as any).id,
            'user_created',
            JSON.stringify({
                email: (savedUser as any).email,
                companyName: (savedUser as any).company_name,
                plan: (savedUser as any).plan,
                createdBy: 'admin'
            }),
            request.headers.get('x-forwarded-for') || '127.0.0.1',
            request.headers.get('user-agent') || 'Admin Panel'
        ]);

        // Return user data (without password hash)
        const { password_hash, ...userResponse } = savedUser as any;

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

type NewUser = { email: string; firstName?: string; lastName?: string; company_name?: string; plan?: string };

const fullName = (u: NewUser) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || "there";

async function sendWelcomeEmail(user: NewUser): Promise<void> {
    try {
        const postmark = await import('postmark');
        const client = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN || '');

        // Option A: Use Postmark Template (recommended)
        // Replace TEMPLATE_ID with your actual Postmark template ID
        const TEMPLATE_ID = process.env.POSTMARK_WELCOME_TEMPLATE_ID || '123456';

        await client.sendEmailWithTemplate({
            From: process.env.POSTMARK_FROM_EMAIL || 'noreply@virtualaddresshub.co.uk',
            To: user.email,
            TemplateId: parseInt(TEMPLATE_ID),
            TemplateModel: {
                firstName: user.firstName ?? "",
                lastName: user.lastName ?? "",
                fullName: fullName(user),
                email: user.email,
                companyName: user.company_name || 'N/A',
                plan: user.plan || 'basic',
                loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/login`
            }
        });

        // Option B: Keep inline body (current approach)
        // Uncomment this block and comment out the template approach above if you prefer inline HTML
        /*
        await client.sendEmail({
            From: process.env.POSTMARK_FROM_EMAIL || 'noreply@virtualaddresshub.co.uk',
            To: user.email,
            Subject: 'Welcome to VirtualAddressHub',
            HtmlBody: `
        <h1>Welcome to VirtualAddressHub!</h1>
        <p>Dear ${fullName(user)},</p>
        <p>Welcome to VirtualAddressHub! Your account has been successfully created.</p>
        <p><strong>Account Details:</strong></p>
        <ul>
          <li>Email: ${user.email}</li>
        </ul>
        <p>You can now log in to your account and start using our services.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Your Account</a></p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The VirtualAddressHub Team</p>
      `,
            TextBody: `
        Welcome to VirtualAddressHub!
        
        Dear ${fullName(user)},
        
        Welcome to VirtualAddressHub! Your account has been successfully created.
        
        Account Details:
        - Company: ${user.company_name || 'N/A'}
        - Plan: ${user.plan || 'basic'}
        - Email: ${user.email}
        
        You can now log in to your account and start using our services.
        Login URL: ${process.env.NEXT_PUBLIC_BASE_URL}/login
        
        If you have any questions, please don't hesitate to contact our support team.
        
        Best regards,
        The VirtualAddressHub Team
      `
        });
        */

        console.log(`Welcome email sent to: ${user.email}`);

    } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't throw error - user creation should still succeed
    }
}

