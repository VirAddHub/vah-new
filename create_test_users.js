// create_test_users.js - Create test users for development
const { Pool } = require('pg');
const { hashPasswordSync } = require('./server/lib/password');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestUsers() {
    try {
        console.log('Creating test users...');

        const now = Date.now();

    // Create regular user
    const userPassword = hashPasswordSync('UserPass123!');
    const userResult = await pool.query(`
      INSERT INTO "user" (
        created_at, updated_at, name, email, password,
        first_name, last_name, is_admin, role, status,
        kyc_status, plan_status, plan_start_date, onboarding_step
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, email, first_name, last_name, name, role, is_admin, status, kyc_status, plan_status, created_at, updated_at
    `, [
      now, now, 'Regular User', 'user@example.com', userPassword,
      'Regular', 'User', false, 'user', 'active',
      'pending', 'active', now, 'signup'
    ]);
    const user = userResult.rows[0];

        console.log('✅ Created regular user:', user.email);

    // Create admin user
    const adminPassword = hashPasswordSync('AdminPass123!');
    const adminResult = await pool.query(`
      INSERT INTO "user" (
        created_at, updated_at, name, email, password,
        first_name, last_name, is_admin, role, status,
        kyc_status, plan_status, plan_start_date, onboarding_step
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, email, first_name, last_name, name, role, is_admin, status, kyc_status, plan_status, created_at, updated_at
    `, [
      now, now, 'Admin User', 'admin@example.com', adminPassword,
      'Admin', 'User', true, 'admin', 'active',
      'approved', 'active', now, 'complete'
    ]);
    const admin = adminResult.rows[0];

        console.log('✅ Created admin user:', admin.email);

    // Create some sample plans
    await pool.query(`
      INSERT INTO plans (name, slug, description, price_pence, interval, currency, features_json, active, sort)
      VALUES 
        ('Basic', 'basic', 'Basic plan for individuals', 1999, 'month', 'GBP', '["Mail forwarding", "Basic support"]', true, 1),
        ('Professional', 'professional', 'Professional plan for businesses', 4999, 'month', 'GBP', '["Mail forwarding", "Priority support", "Scanning"]', true, 2),
        ('Enterprise', 'enterprise', 'Enterprise plan for large organizations', 9999, 'month', 'GBP', '["Mail forwarding", "24/7 support", "Scanning", "API access"]', true, 3)
      ON CONFLICT (slug) DO NOTHING
    `);

        console.log('✅ Created sample plans');

        // Create some sample mail items for the regular user
        const sampleMailItems = [
            {
                subject: 'Welcome to Virtual Address Hub',
                sender_name: 'Support Team',
                received_date: new Date().toISOString().split('T')[0],
                status: 'received',
                tag: 'welcome'
            },
            {
                subject: 'Your Monthly Statement',
                sender_name: 'Bank of Example',
                received_date: new Date().toISOString().split('T')[0],
                status: 'scanned',
                tag: 'financial'
            },
            {
                subject: 'Package Delivery Notice',
                sender_name: 'Royal Mail',
                received_date: new Date().toISOString().split('T')[0],
                status: 'received',
                tag: 'delivery'
            }
        ];

    for (const item of sampleMailItems) {
      await pool.query(`
        INSERT INTO mail_item (user_id, subject, sender_name, received_date, status, tag, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [user.id, item.subject, item.sender_name, item.received_date, item.status, item.tag, now]);
    }

        console.log('✅ Created sample mail items');

    // Create some sample support tickets
    await pool.query(`
      INSERT INTO support_ticket (user_id, subject, message, status, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [user.id, 'How do I forward mail?', 'I need help understanding how to forward my mail items.', 'open', now]);

        console.log('✅ Created sample support ticket');

        console.log('\n🎉 Test users created successfully!');
        console.log('\nTest credentials:');
        console.log('Regular User: user@example.com / UserPass123!');
        console.log('Admin User: admin@example.com / AdminPass123!');

    } catch (error) {
        console.error('Error creating test users:', error);
    } finally {
        process.exit(0);
    }
}

createTestUsers();
