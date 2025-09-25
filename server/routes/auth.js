// server/routes/auth.js - Real database authentication
const express = require('express');
const { hashPasswordSync, comparePasswordSync } = require('../lib/password');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db } = require('../db');
const { Pool } = require('pg');

// Create a direct PostgreSQL pool for auth routes
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
const { sessionCookieOptions } = require('../../lib/cookies');

const router = express.Router();

// Debug endpoint to test auth routes
router.get('/ping', (req, res) => {
  res.json({ ok: true, message: 'Auth routes are working' });
});

// Temporary migration endpoint (remove after migration is applied)
router.post('/migrate-soft-delete', async (req, res) => {
  try {
    console.log('🔄 Running soft delete migration via API...');

    // Check if deleted_at column exists
    const { rows: columnCheck } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'deleted_at'
    `);

    if (columnCheck.length === 0) {
      console.log('📝 Adding deleted_at column to user table...');
      await pool.query('ALTER TABLE "user" ADD COLUMN deleted_at TIMESTAMPTZ');
      console.log('✅ deleted_at column added');
    } else {
      console.log('✅ deleted_at column already exists');
    }

    // Check if admin_audit table exists
    const { rows: tableCheck } = await pool.query(`
      SELECT to_regclass('public.admin_audit') as exists
    `);

    if (!tableCheck[0].exists) {
      console.log('📝 Creating admin_audit table...');
      await pool.query(`
        CREATE TABLE admin_audit (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER NOT NULL REFERENCES "user"(id),
          action VARCHAR(100) NOT NULL,
          target_user_id INTEGER REFERENCES "user"(id),
          meta JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('✅ admin_audit table created');
    } else {
      console.log('✅ admin_audit table already exists');
    }

    // Create indexes
    console.log('📝 Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON "user"(deleted_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit(admin_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit(action)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at)');

    // Create unique index for active emails only
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_uniq
      ON "user" (LOWER(email))
      WHERE deleted_at IS NULL
    `);

    console.log('✅ Indexes created');
    console.log('🎉 Migration completed successfully!');

    res.json({ 
      ok: true, 
      message: 'Soft delete migration completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Migration failed', 
      details: error.message 
    });
  }
});

// Validation middleware
const validateSignup = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').optional().isLength({ max: 100 }),
  body('last_name').optional().isLength({ max: 100 }),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Helper function to create JWT token
function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    {
      issuer: 'virtualaddresshub',
      audience: 'vah-users',
      expiresIn: '7d'
    }
  );
}

// Helper function to set session cookie
function setSession(res, user) {
  const token = createToken(user);
  res.cookie('vah_session', token, sessionCookieOptions());
  return token;
}

// POST /api/auth/signup
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, first_name = '', last_name = '' } = req.body;

    // Basic validation
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Validation failed', details: [{ path: 'email', msg: 'Invalid email' }] });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Validation failed', details: [{ path: 'password', msg: 'Password must be at least 8 characters' }] });
    }

    // Hash password
    const passwordHash = hashPasswordSync(password);

    // Create user
    const now = Date.now();
    const name = `${first_name} ${last_name}`.trim();

    // Insert user and get created user in one query (PostgreSQL style)
    const { rows } = await pool.query(`
      INSERT INTO "user" (
        created_at, updated_at, name, email, password,
        first_name, last_name, is_admin, role, status,
        kyc_status, plan_status, plan_start_date, onboarding_step
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, email, first_name, last_name, name, role, is_admin, status, kyc_status, plan_status, created_at, updated_at
    `, [
      now, now, name, email.toLowerCase(), passwordHash,
      first_name, last_name, false, 'user', 'active',
      'pending', 'active', now, 'signup'
    ]);
    const user = rows[0];

    if (!user) {
      throw new Error('Failed to create user - INSERT did not return user data');
    }

    // Set session user for cross-site authentication
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_admin: !!user.is_admin,
      role: user.role || 'user'
    };

    // Return user data (without password)
    const { password: _, ...userData } = user;

    console.log('[signup] success', { userId: user.id, email: user.email });

    res.status(201).json({
      user: req.session.user
    });

  } catch (error) {
    // PostgreSQL duplicate email error
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }

    console.error('[signup] error', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email (explicitly select columns to avoid deleted_at dependency)
    const { rows } = await pool.query(`
      SELECT id, email, password, first_name, last_name, is_admin, role, status, 
             plan_status, kyc_status, created_at, updated_at
      FROM "user" 
      WHERE email = $1
    `, [email]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ ok: false, error: 'account_suspended' });
    }

    // Check password
    const isValidPassword = comparePasswordSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session user for cross-site authentication
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_admin: !!user.is_admin,
      role: user.role || 'user'
    };

    // Return user data (without password)
    const { password: _, ...userData } = user;
    res.json({
      user: req.session.user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid', { path: '/' });
    res.json({ ok: true });
  });
});

// GET /api/auth/whoami
router.get('/whoami', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({ user: req.session.user });
});

module.exports = router;