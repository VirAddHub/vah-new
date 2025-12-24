const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database connection - use the same as the server
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://vah_postgres_user:your_password_here@dpg-d2vikgnfte5s73c5nv80-a:5432/vah_postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestUsers() {
  try {
    console.log('Creating test users...');

    // Hash passwords
    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    const userPassword = await bcrypt.hash('UserPass123!', 12);

    const now = Date.now();

    // Create admin user
    const adminResult = await pool.query(`
      INSERT INTO "user" (
        email, password, first_name, last_name, name,
        is_admin, role, status, kyc_status, plan_status,
        plan_start_date, onboarding_step, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) ON CONFLICT (email) DO UPDATE SET
        is_admin = EXCLUDED.is_admin,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        password = EXCLUDED.password,
        updated_at = EXCLUDED.updated_at
      RETURNING id, email, first_name, last_name, is_admin, role
    `, [
      'admin@virtualaddresshub.co.uk',
      adminPassword,
      'Admin',
      'User',
      'Admin User',
      true,
      'admin',
      'active',
      'verified',
      'active',
      now,
      'completed',
      now,
      now
    ]);

    console.log('✅ Admin user created:', adminResult.rows[0]);

    // Create regular user
    const userResult = await pool.query(`
      INSERT INTO "user" (
        email, password, first_name, last_name, name,
        is_admin, role, status, kyc_status, plan_status,
        plan_start_date, onboarding_step, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) ON CONFLICT (email) DO UPDATE SET
        is_admin = EXCLUDED.is_admin,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        password = EXCLUDED.password,
        updated_at = EXCLUDED.updated_at
      RETURNING id, email, first_name, last_name, is_admin, role
    `, [
      'user@virtualaddresshub.co.uk',
      userPassword,
      'Regular',
      'User',
      'Regular User',
      false,
      'user',
      'active',
      'verified',
      'active',
      now,
      'completed',
      now,
      now
    ]);

    console.log('✅ Regular user created:', userResult.rows[0]);

    console.log('\n🎉 Test users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: admin@virtualaddresshub.co.uk / AdminPass123!');
    console.log('User: user@virtualaddresshub.co.uk / UserPass123!');

  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await pool.end();
  }
}

createTestUsers();