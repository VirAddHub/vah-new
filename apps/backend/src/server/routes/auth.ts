import { Router } from "express";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../db';
import { selectOne } from '../db-helpers';

const router = Router();

// Cookie options helper
const { sessionCookieOptions } = require("../../lib/cookies");

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};
        
        if (!email || !password) {
            return res.status(400).json({ 
                ok: false, 
                error: "missing_fields",
                message: "Email and password are required" 
            });
        }

        // Get user from database
        const pool = getPool();
        const user = await selectOne(pool, 
            'SELECT id, email, password, first_name, last_name, is_admin, role, status FROM "user" WHERE email = $1 AND status = $2',
            [email, 'active']
        );

        if (!user) {
            return res.status(401).json({ 
                ok: false, 
                error: "invalid_credentials",
                message: "Invalid email or password" 
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                ok: false, 
                error: "invalid_credentials",
                message: "Invalid email or password" 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                isAdmin: user.is_admin,
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        // Set session cookie
        res.cookie('vah_session', token, sessionCookieOptions);

        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            ok: true,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                is_admin: user.is_admin,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('[auth/login] Error:', error);
        res.status(500).json({ 
            ok: false, 
            error: "internal_error",
            message: "An error occurred during login" 
        });
    }
});

router.post("/logout", (req, res) => {
    try {
        // Clear session cookie
        res.clearCookie('vah_session', { 
            httpOnly: true, 
            sameSite: 'lax', 
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
        
        res.json({ ok: true, message: "Logged out successfully" });
    } catch (error) {
        console.error('[auth/logout] Error:', error);
        res.status(500).json({ 
            ok: false, 
            error: "internal_error",
            message: "An error occurred during logout" 
        });
    }
});

router.get("/whoami", async (req, res) => {
    try {
        const token = req.cookies.vah_session;
        
        if (!token) {
            return res.status(401).json({ 
                ok: false, 
                error: "not_authenticated",
                message: "No session found" 
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        
        // Get fresh user data from database
        const pool = getPool();
        const user = await selectOne(pool, 
            'SELECT id, email, first_name, last_name, is_admin, role FROM "user" WHERE id = $1 AND status = $2',
            [decoded.userId, 'active']
        );

        if (!user) {
            return res.status(401).json({ 
                ok: false, 
                error: "user_not_found",
                message: "User not found" 
            });
        }

        res.json({
            ok: true,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                is_admin: user.is_admin,
                role: user.role
            }
        });

    } catch (error) {
        console.error('[auth/whoami] Error:', error);
        res.status(401).json({ 
            ok: false, 
            error: "invalid_token",
            message: "Invalid or expired session" 
        });
    }
});

export default router;
