import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getPool } from '../db';
import { sendPasswordResetEmail } from '../../lib/mailer';
import { ENV } from '../../env';
import type { Request, Response } from 'express';

const router = Router();

// POST /api/profile/reset-password-request
router.post('/reset-password-request', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address required'
      });
    }

    const { email } = req.body;
    const pool = getPool();

    // Always return success to prevent email enumeration
    const publicResp = {
      success: true,
      message: 'If an account exists, a reset link has been sent.'
    };

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, first_name, name FROM "user" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json(publicResp);
    }

    const user = userResult.rows[0];

    // Generate reset token and expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresMs = Date.now() + 30 * 60 * 1000; // 30 minutes

    // Store reset token in database
    await pool.query(`
      UPDATE "user" 
      SET password_reset_token = $1, password_reset_expires = $2, password_reset_used_at = NULL
      WHERE id = $3
    `, [token, expiresMs, user.id]);

    // Send reset email
    const resetUrl = `${ENV.APP_BASE_URL}/reset-password/confirm?token=${token}`;

    try {
      await sendPasswordResetEmail({
        email: user.email,
        firstName: user.first_name || "there",
        cta_url: resetUrl
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request if email fails
    }

    res.json(publicResp);

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/profile/reset-password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { token, password } = req.body;
    const pool = getPool();

    // Find user with valid reset token
    const userResult = await pool.query(`
      SELECT id, password_reset_expires, password_reset_used_at
      FROM "user"
      WHERE password_reset_token = $1
    `, [token]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'invalid_token',
        message: 'Invalid or expired token'
      });
    }

    const user = userResult.rows[0];

    // Check if token has been used
    if (user.password_reset_used_at) {
      return res.status(400).json({
        success: false,
        code: 'used',
        message: 'This link has already been used'
      });
    }

    // Check if token has expired
    if (!user.password_reset_expires || Date.now() > Number(user.password_reset_expires)) {
      return res.status(400).json({
        success: false,
        code: 'expired',
        message: 'Token expired'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = Date.now();

    // Update password and clear reset token
    await pool.query(`
      UPDATE "user"
      SET password = $1, password_reset_token = NULL, password_reset_used_at = $2, password_reset_expires = NULL
      WHERE id = $3
    `, [hashedPassword, now, user.id]);

    res.json({
      success: true,
      message: 'Password updated successfully. You can now log in.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
