import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getPool } from "../db";
import { generateToken, verifyToken, extractTokenFromHeader } from "../../lib/jwt";
import { BCRYPT_ROUNDS, SESSION_IDLE_TIMEOUT_SECONDS } from "../../config/auth";
import { sendWelcomeKycEmail } from "../../lib/mailer";
import { ENV } from "../../env";
import { upsertSubscriptionForUser } from "../services/subscription-linking";
import { ok, unauthorized, badRequest, serverError, conflict } from "../lib/apiResponse";
import { logger } from "../../lib/logger";

const router = Router();

// ADDED: Define a schema for login input validation
const loginSchema = z.object({
    email: z.string().email("Invalid email format.").trim().toLowerCase(),
    password: z.string().min(1, "Password is required."),
});

// Test database connection endpoint
router.get("/test-db", async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query('SELECT NOW() as current_time');
        res.json({ ok: true, message: "Database connected", time: result.rows[0].current_time });
    } catch (error: any) {
        res.status(500).json({ ok: false, error: "database_error", message: error.message });
    }
});

// Test user table endpoint
router.get("/test-user-table", async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query('SELECT COUNT(*) as count FROM "user"');
        res.json({ ok: true, message: "User table exists", user_count: result.rows[0].count });
    } catch (error: any) {
        res.status(500).json({ ok: false, error: "table_error", message: error.message });
    }
});

// Get user table schema endpoint
router.get("/user-table-schema", async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'user'
            ORDER BY ordinal_position
        `);
        res.json({
            ok: true,
            message: "User table schema",
            columns: result.rows
        });
    } catch (error: any) {
        res.status(500).json({ ok: false, error: "schema_error", message: error.message });
    }
});

// Debug endpoint to check environment variables
router.get("/debug-env", async (req, res) => {
    res.json({
        ok: true,
        env: {
            POSTMARK_TOKEN: process.env.POSTMARK_TOKEN ? "SET" : "NOT SET",
            POSTMARK_FROM: process.env.POSTMARK_FROM || "NOT SET",
            POSTMARK_FROM_NAME: process.env.POSTMARK_FROM_NAME || "NOT SET",
            POSTMARK_REPLY_TO: process.env.POSTMARK_REPLY_TO || "NOT SET",
            POSTMARK_STREAM: process.env.POSTMARK_STREAM || "NOT SET",
            NODE_ENV: process.env.NODE_ENV || "NOT SET",
            APP_BASE_URL: process.env.APP_BASE_URL || process.env.APP_URL || "NOT SET (defaults to localhost:3000)"
        }
    });
});

// Debug endpoint to check specific user
router.get("/debug-user/:email", async (req, res) => {
    try {
        const email = req.params.email;
        const pool = getPool();
        const user = await pool.query(
            'SELECT id, email, password, first_name, last_name, is_admin, role, status FROM "user" WHERE email = $1',
            [email.toLowerCase()]
        );

        if (!user.rows[0]) {
            return res.json({ ok: false, message: "User not found" });
        }

        const userData = user.rows[0];
        res.json({
            ok: true,
            user: {
                id: userData.id,
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                is_admin: userData.is_admin,
                role: userData.role,
                status: userData.status,
                has_password: !!userData.password,
                password_length: userData.password ? userData.password.length : 0
            }
        });
    } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// Debug endpoint to test password update
router.post("/debug-update-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ ok: false, error: "email and newPassword required" });
        }

        const pool = getPool();

        // Get user
        const userResult = await pool.query(
            'SELECT id FROM "user" WHERE email = $1',
            [email.toLowerCase()]
        );

        if (!userResult.rows[0]) {
            return res.status(404).json({ ok: false, error: "User not found" });
        }

        const userId = userResult.rows[0].id;

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        // Update password
        const updateResult = await pool.query(`
            UPDATE "user" 
            SET password = $1, updated_at = $3
            WHERE id = $2
        `, [hashedPassword, userId, Date.now()]);

        res.json({
            ok: true,
            message: "Password updated",
            userId,
            rowCount: updateResult.rowCount,
            success: updateResult.rowCount === 1
        });

    } catch (error: any) {
        logger.error('[debug-update-password] error', { message: error?.message });
        res.status(500).json({ ok: false, error: error.message });
    }
});

// Email test endpoint
router.post("/test-email", async (req, res) => {
    try {
        const { to } = req.body;
        if (!to) {
            return res.status(400).json({ ok: false, error: "to_required" });
        }

        const { sendTemplateEmail } = await import("../../lib/mailer");

        await sendTemplateEmail({
            to: to,
            templateAlias: 'password-reset-email',
            model: {
                firstName: 'Test User',
                resetLink: 'https://example.com/test',
                expiryMinutes: '30'
            }
        });

        res.json({ ok: true, message: "Test email sent successfully" });
    } catch (error: any) {
        logger.error('[test-email] error', { message: error?.message });
        res.status(500).json({ ok: false, error: error.message || 'email_failed' });
    }
});

/** Validation mirrors your frontend exactly */
const SignupSchema = z.object({
    // Contact
    first_name: z.string().min(1).max(50),
    last_name: z.string().min(1).max(50),
    // Normalize to avoid "Invalid email address" due to whitespace/case
    email: z.string().email().trim().toLowerCase(),
    password: z.string().min(8).max(100)
        .regex(/[a-z]/, "password must contain a lowercase letter")
        .regex(/[A-Z]/, "password must contain an uppercase letter")
        .regex(/\d/, "password must contain a number"),
    phone: z.string().optional(),

    // Company
    business_type: z.enum(["limited_company", "llp", "lp", "sole_trader", "partnership", "charity", "other"]),
    country_of_incorporation: z.enum(["GB", "IE", "US", "CA", "AU"]),
    company_number: z.string().optional(),
    company_name: z.string().min(1).max(100),

    // Forwarding address
    forward_to_first_name: z.string().min(1).max(50),
    forward_to_last_name: z.string().min(1).max(50),
    address_line1: z.string().min(1).max(200),
    address_line2: z.string().optional(),
    city: z.string().min(1).max(100),
    postcode: z.string().min(1).max(20),
    forward_country: z.enum(["GB", "IE", "US", "CA", "AU"]),

    // Step 1/3 fields that backend can ignore or store if you already do
    billing: z.enum(["monthly", "annual"]).optional(),
    price: z.string().optional(), // frontend-calculated

    // Controllers declaration (REQUIRED during signup)
    isSoleController: z.boolean(),
    additionalControllersCount: z.number().int().min(0).nullable().optional(),

    // Business owners (required if not sole controller)
    additionalOwners: z.array(z.object({
        fullName: z.string().min(1).max(200),
        email: z.string().email().trim().toLowerCase(),
    })).optional(),
    ownersPendingInfo: z.boolean().optional(),
});

router.post("/signup", async (req, res) => {
    // Avoid logging PII (emails/names/raw body) in production logs.
    if (process.env.NODE_ENV !== 'production') {
        logger.debug('[auth/signup] request received', { hasBody: Boolean(req.body) });
    }

    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            ok: false,
            error: "validation_error",
            message: parsed.error.issues.map((e: any) => e.message).join(', '),
            details: parsed.error.flatten(),
        });
    }
    const i = parsed.data;

    // Normalize
    const email = i.email.toLowerCase();

    if (process.env.NODE_ENV !== 'production') {
        logger.debug('[auth/signup] parsed', { billing: i.billing ?? 'unknown' });
    }

    try {
        // Enforce unique email at app layer (still rely on DB unique index if you have it)
        // Note: Soft-deleted users are included in this check to prevent email reuse
        const pool = getPool();
        const exists = await pool.query<{ count: string }>(
            `SELECT COUNT(*)::int AS count FROM "user" WHERE email = $1`,
            [email]
        );
        const count = Number(exists.rows[0]?.count ?? 0);

        if (count > 0) {
            logger.info('[auth/signup] duplicate_email', { count });

            return res.status(409).json({
                ok: false,
                code: 'EMAIL_EXISTS',
                error: "email_exists",
                message: 'An account already exists with this email address.',
            });
        }

        const hash = await bcrypt.hash(i.password, BCRYPT_ROUNDS);

        // Insert using the `password` column (we know this exists from the schema)
        const now = Date.now();
        // Construct forwarding address from individual fields
        const forwardingAddress = `${i.forward_to_first_name} ${i.forward_to_last_name}\n${i.address_line1}${i.address_line2 ? '\n' + i.address_line2 : ''}\n${i.city}, ${i.postcode}\n${i.forward_country}`;

        // Validate controllers declaration (REQUIRED)
        if (i.isSoleController === undefined) {
            return res.status(400).json({
                ok: false,
                error: "validation_error",
                message: "isSoleController is required",
            });
        }

        const isSoleController = i.isSoleController;
        let additionalControllersCount: number | null = null;
        const controllersDeclaredAt = new Date();
        let ownersPendingInfo = false;

        // Validate business owners logic
        if (isSoleController === true) {
            // If sole controller, no owners allowed
            if (i.additionalOwners && i.additionalOwners.length > 0) {
                return res.status(400).json({
                    ok: false,
                    error: "validation_error",
                    message: "Cannot add business owners if you are the sole controller",
                });
            }
            if (i.ownersPendingInfo === true) {
                return res.status(400).json({
                    ok: false,
                    error: "validation_error",
                    message: "Cannot have pending owners if you are the sole controller",
                });
            }
            additionalControllersCount = (i.additionalControllersCount === null || i.additionalControllersCount === 0) ? null : 0;
        } else {
            // If not sole controller, must either have owners OR pending info
            if (!i.additionalOwners || i.additionalOwners.length === 0) {
                if (i.ownersPendingInfo !== true) {
                    return res.status(400).json({
                        ok: false,
                        error: "validation_error",
                        message: "If you are not the sole controller, you must either add business owners or indicate that you don't have their email addresses yet",
                    });
                }
                ownersPendingInfo = true;
            } else {
                // Owners provided, validate at least 1
                if (i.additionalOwners.length < 1) {
                    return res.status(400).json({
                        ok: false,
                        error: "validation_error",
                        message: "At least one business owner is required if you are not the sole controller",
                    });
                }
                ownersPendingInfo = false;
            }
            additionalControllersCount = (i.additionalControllersCount === null || i.additionalControllersCount === undefined)
                ? null
                : Math.max(1, i.additionalControllersCount);
        }

        // Validate additional business owners email constraints
        if (!isSoleController && i.additionalOwners && i.additionalOwners.length > 0) {
            // Normalize main account email
            const normalizedMainEmail = email.trim().toLowerCase();
            
            // Normalize and validate additional owner emails
            const normalizedOwnerEmails = i.additionalOwners.map(owner => {
                const normalized = owner.email.trim().toLowerCase();
                return { original: owner, normalized };
            });
            
            // Check 1: No owner email matches main account email
            const matchingMainEmail = normalizedOwnerEmails.find(
                ({ normalized }) => normalized === normalizedMainEmail
            );
            if (matchingMainEmail) {
                return res.status(400).json({
                    ok: false,
                    error: "validation_error",
                    message: "Additional business owner email cannot be the same as the account holder email.",
                });
            }
            
            // Check 2: No duplicate emails within additional owners
            const emailSet = new Set<string>();
            const duplicateOwner = normalizedOwnerEmails.find(({ normalized }) => {
                if (emailSet.has(normalized)) {
                    return true;
                }
                emailSet.add(normalized);
                return false;
            });
            if (duplicateOwner) {
                return res.status(400).json({
                    ok: false,
                    error: "validation_error",
                    message: "Each additional business owner must have a unique email address.",
                });
            }
        }

        const insertQuery = `
      INSERT INTO "user" (
        first_name, last_name, email, phone,
        business_type, country_of_incorporation, company_number, company_name,
        forward_to_first_name, forward_to_last_name, address_line1, address_line2,
        city, postcode, forward_country, forwarding_address,
        password, created_at, updated_at, is_admin, role,
        billing, price,
        is_sole_controller, additional_controllers_count, controllers_declared_at, owners_pending_info
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,$16,
        $17,$18,$19,$20,$21,
        $22,$23,
        $24,$25,$26,$27
      )
      RETURNING id, email, first_name, last_name
    `;

        const args = [
            i.first_name, i.last_name, email, i.phone ?? null,
            i.business_type, i.country_of_incorporation, i.company_number ?? null, i.company_name,
            i.forward_to_first_name, i.forward_to_last_name, i.address_line1, i.address_line2 ?? null,
            i.city, i.postcode, i.forward_country, forwardingAddress,
            hash, now, now, false, 'user',
            i.billing ?? null, i.price ?? null,
            isSoleController, additionalControllersCount, controllersDeclaredAt, ownersPendingInfo
        ];

        const rs = await pool.query(insertQuery, args);
        const row = rs.rows[0];

        // Create business owners if provided
        // Validation already performed above - all owners are valid at this point
        if (!isSoleController && i.additionalOwners && i.additionalOwners.length > 0) {
            const { createBusinessOwner } = await import('../services/businessOwners');
            await Promise.allSettled(
                i.additionalOwners.map((owner) =>
                    createBusinessOwner(row.id, owner.fullName, owner.email).catch((error) => {
                        logger.error('[auth/signup] failed_to_create_business_owner', {
                            userId: row.id,
                            // Only log email in dev; avoid PII in prod logs.
                            ...(process.env.NODE_ENV !== 'production' ? { email: owner.email } : {}),
                            message: (error as any)?.message ?? String(error),
                        });
                    })
                )
            );
        }

        // Manual test:
        // 1) Go to /signup on the frontend and create a brand new user with a fresh email.
        // 2) Confirm the API returns 201 and the user is logged in.
        // 3) Check Postmark Activity: a "welcome + KYC" email should be sent to that email,
        //    using the template with variables {{first_name}} and {{cta_url}}.
        // 4) Click the link in the email and confirm it lands on the dashboard (with ?next=/dashboard if relevant).

        // Send welcome + KYC email (non-blocking, non-fatal)
        const displayName =
            row.first_name?.trim() ||
            row.last_name?.trim() ||
            (row.email ? row.email.split("@")[0] : "") ||
            "there";
        sendWelcomeKycEmail({
            email: row.email,
            firstName: displayName,
        })
            .then(() => logger.info('[auth/signup] welcome_email_sent', { userId: row.id }))
            .catch((emailError: any) => {
                logger.warn('[auth/signup] welcome_email_failed_nonfatal', {
                    userId: row.id,
                    ...(process.env.NODE_ENV !== 'production' ? { email: row.email } : {}),
                    message: emailError?.message || String(emailError),
                });
            });

        // Auto-login after signup (so the user can immediately set up GoCardless mandate)
        const token = generateToken({
            id: row.id,
            email: row.email,
            is_admin: false,
            role: 'user'
        });

        // Set HttpOnly cookie for cross-site auth (frontend on different domain)
        res.cookie('vah_session', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            maxAge: SESSION_IDLE_TIMEOUT_SECONDS * 1000 // 60 minutes
        });

        // Return standardized response format
        return ok(res, {
            user: {
                user_id: row.id,
                email: row.email,
                first_name: row.first_name,
                last_name: row.last_name,
                is_admin: false,
                role: 'user',
            },
            token
        }, 201);
    } catch (err: any) {
        const m = String(err?.message || "");
        if (m.includes("duplicate key value") && m.toLowerCase().includes("email")) {
            // Debug logging: log DB constraint violation
            logger.info('[auth/signup] duplicate_email_db_constraint', { error: m });

            return conflict(res, 'email_exists', 'An account already exists with this email address.');
        }
        logger.error("[auth/signup] error", { message: err?.message || String(err) });
        return serverError(res, "Server error during signup");
    }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
    try {
        // REVISED: Use Zod for robust validation and parsing
        const validation = loginSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                ok: false,
                error: "validation_error",
                message: validation.error.issues.map((e: any) => e.message).join(', ')
            });
        }

        const { email, password } = validation.data;

        // Get user from database (exclude soft-deleted users)
        const pool = getPool();
        const user = await pool.query(
            'SELECT id, email, password, first_name, last_name, is_admin, role, status, kyc_status FROM "user" WHERE email = $1 AND status = $2 AND deleted_at IS NULL',
            [email, 'active'] // Use the validated and normalized email
        );

        if (!user.rows[0]) {
            return res.status(401).json({
                ok: false,
                error: "invalid_credentials",
                message: "Invalid email or password"
            });
        }

        const userData = user.rows[0];

        const isValidPassword = await bcrypt.compare(password, userData.password);

        if (!isValidPassword) {
            return res.status(401).json({
                ok: false,
                error: "invalid_credentials",
                message: "Invalid email or password"
            });
        }

        // Note: KYC verification is done in the dashboard after login
        // Users can log in regardless of KYC status - KYC is enforced at the feature level (mail forwarding, certificates, etc.)

        // Update last_login_at timestamp (non-blocking)
        const now = Date.now();
        pool
            .query('UPDATE "user" SET last_login_at = $1, last_active_at = $2 WHERE id = $3', [
                now,
                now,
                userData.id,
            ])
            .catch((err: any) => {
                logger.warn('[auth/login] failed_to_update_last_login_at', {
                    userId: userData.id,
                    message: err?.message ?? String(err),
                });
            });

        // Generate JWT token
        const token = generateToken({
            id: userData.id,
            email: userData.email,
            is_admin: userData.is_admin,
            role: userData.role
        });

        // Set HttpOnly cookie for iframe authentication (cross-site)
        res.cookie('vah_session', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            maxAge: SESSION_IDLE_TIMEOUT_SECONDS * 1000 // 60 minutes
        });

        // REVISED: The user object in the response should match the payload for consistency
        res.json({
            ok: true,
            data: {
                user: { // Nest user data inside a user object
                    user_id: userData.id,
                    email: userData.email,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    is_admin: userData.is_admin,
                    role: userData.role,
                },
                token: token
            }
        });

    } catch (error) {
        logger.error('[auth/login] error', { message: (error as any)?.message ?? String(error) });
        res.status(500).json({
            ok: false,
            error: "internal_error",
            message: "An error occurred during login"
        });
    }
});

// --- LOGOUT ---
router.post("/logout", (req, res) => {
    try {
        // Determine secure environment (matches how cookies are set in login/signup)
        const isSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
        
        // Clear cookies using clearCookie (works for direct browser requests)
        // Clear vah_session cookie with SAME attributes as when set
        // Matches: httpOnly: true, secure: true, sameSite: 'none', path: '/'
        res.clearCookie('vah_session', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
        });

        // Clear CSRF token cookie with SAME attributes as when set
        // Matches: httpOnly: false, secure: isSecure, sameSite: isSecure ? 'none' : 'lax', path: '/'
        res.clearCookie('vah_csrf_token', {
            httpOnly: false,
            secure: isSecure,
            sameSite: isSecure ? 'none' : 'lax',
            path: '/',
        });

        // Also explicitly set Set-Cookie headers to ensure they're forwarded by BFF proxy
        // This ensures cookies are cleared even when request comes through Next.js BFF
        // Express requires each Set-Cookie header to be appended individually
        const baseClearOptions = 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0';
        const secureFlag = isSecure ? '; Secure' : '';
        const sameSiteValue = isSecure ? 'None' : 'Lax';
        
        // Set explicit Set-Cookie headers for clearing (for BFF forwarding)
        res.append('Set-Cookie', `vah_session=; ${baseClearOptions}; HttpOnly; SameSite=${sameSiteValue}${secureFlag}`);
        res.append('Set-Cookie', `vah_csrf_token=; ${baseClearOptions}; SameSite=${sameSiteValue}${secureFlag}`);

        res.json({ ok: true, message: "Logged out successfully" });
    } catch (error) {
        logger.error('[auth/logout] error', { message: (error as any)?.message ?? String(error) });
        res.status(500).json({
            ok: false,
            error: "internal_error",
            message: "An error occurred during logout"
        });
    }
});

// --- WHOAMI ---
router.get("/whoami", async (req, res) => {
    try {
        // Extract token from Authorization header OR cookie.
        // Note: Vercel rewrites /api/* to the backend, so the auth cookie is first-party on the Vercel domain
        // and will be forwarded to the backend on rewritten requests.
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader) || req.cookies?.vah_session;

        if (!token) {
            return unauthorized(res, "No session token provided");
        }

        // Verify the token
        const payload = verifyToken(token);
        if (!payload) {
            return unauthorized(res, "Invalid or expired token");
        }

        // Verify user still exists and is not deleted
        const pool = getPool();
        const user = await pool.query(
            'SELECT id, email, is_admin, role, kyc_status, name, first_name, last_name, forwarding_address, plan_status, plan_id, is_sole_controller, additional_controllers_count, controllers_declared_at FROM "user" WHERE id = $1 AND deleted_at IS NULL',
            [payload.id]
        );

        if (!user.rows[0]) {
            return res.status(401).json({
                ok: false,
                error: "user_deleted",
                message: "User account has been deleted"
            });
        }

        const userData = user.rows[0];

        // Safety net: if an account is active but has no subscription row, recreate it automatically.
        // This prevents "active user with no subscription row" from ever persisting again.
        try {
            if (userData?.plan_status === 'active' && userData?.plan_id) {
                const s = await pool.query(`SELECT 1 FROM subscription WHERE user_id = $1 LIMIT 1`, [userData.id]);
                if (!s.rows?.length) {
                    await upsertSubscriptionForUser({
                        pool,
                        userId: Number(userData.id),
                        status: 'active',
                    });
                }
            }
        } catch (e) {
            // Never block whoami if this repair fails.
            logger.warn('[auth/whoami] subscription repair failed', { message: (e as any)?.message ?? String(e) });
        }

        // Derived field: controllers_verification_required
        const controllersVerificationRequired = userData.is_sole_controller === false;

        // Return user data from database (not token)
        return ok(res, {
            user: {
                id: userData.id,
                email: userData.email,
                is_admin: userData.is_admin,
                role: userData.role,
                kyc_status: userData.kyc_status,
                name: userData.name,
                first_name: userData.first_name,
                last_name: userData.last_name,
                forwarding_address: userData.forwarding_address,
                plan_status: userData.plan_status,
                plan_id: userData.plan_id,
                is_sole_controller: userData.is_sole_controller,
                additional_controllers_count: userData.additional_controllers_count,
                controllers_declared_at: userData.controllers_declared_at,
                controllers_verification_required: controllersVerificationRequired,
            },
        });
    } catch (error) {
        logger.error('[auth/whoami] error', { message: (error as any)?.message ?? String(error) });
        return unauthorized(res, "Invalid or expired session");
    }
});

// Password reset confirmation endpoint
router.post("/reset-password/confirm", async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                ok: false,
                error: "missing_fields",
                message: "Token and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                ok: false,
                error: "password_too_short",
                message: "Password must be at least 8 characters long"
            });
        }

        const pool = getPool();

        // Find user with valid reset token
        const userResult = await pool.query(`
            SELECT id, email, reset_token_hash, reset_token_expires_at, reset_token_used_at
            FROM "user" 
            WHERE reset_token_hash IS NOT NULL 
            AND reset_token_expires_at > NOW() 
            AND reset_token_used_at IS NULL
        `);

        let validUser: { id: number; email: string; reset_token_hash: string; reset_token_expires_at: string; reset_token_used_at: string | null } | null = null;

        // Check if any user's reset token matches (using bcrypt compare)
        for (const user of userResult.rows) {
            const isValidToken = await bcrypt.compare(token, user.reset_token_hash);
            if (isValidToken) {
                validUser = user;
                break;
            }
        }

        if (!validUser) {
            return res.status(400).json({
                ok: false,
                error: "invalid_token",
                message: "Invalid, expired, or already used reset token"
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Update user's password and mark token as used
        const updateResult = await pool.query(`
            UPDATE "user" 
            SET password = $1, 
                reset_token_hash = NULL, 
                reset_token_expires_at = NULL, 
                reset_token_used_at = NOW(),
                updated_at = $3
            WHERE id = $2
        `, [hashedPassword, validUser.id, Date.now()]);

        // Verify the update was successful
        if (updateResult.rowCount !== 1) {
            logger.error('[reset-confirm] database update failed', {
                userId: validUser.id,
                rowCount: updateResult.rowCount,
                expected: 1
            });
            return res.status(500).json({
                ok: false,
                error: "database_error",
                message: "Failed to update password"
            });
        }

        logger.info('[reset-confirm] password updated', { userId: validUser.id });

        return res.status(200).json({
            ok: true,
            message: "Password reset successfully"
        });

    } catch (error: any) {
        logger.error('[reset-confirm] error', { message: error?.message });
        return res.status(500).json({
            ok: false,
            error: "server_error",
            message: "An error occurred while resetting your password"
        });
    }
});

export default router;

