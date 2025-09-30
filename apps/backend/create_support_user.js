#!/usr/bin/env node

// Create support user directly in the database
// Usage: node create_support_user.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createSupportUser() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('Connecting to database...');

        // Check if user already exists
        const exists = await pool.query('SELECT id FROM "user" WHERE email = $1', ['support@virtualaddresshub.co.uk']);
        if (exists.rows.length > 0) {
            console.log('✅ Support user already exists with ID:', exists.rows[0].id);
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash('SupportPass123', 12);

        // Insert the support user
        const result = await pool.query(`
            INSERT INTO "user" (
                email, first_name, last_name, password, 
                business_type, country_of_incorporation, company_name,
                forward_to_first_name, forward_to_last_name, 
                address_line1, city, postcode, forward_country,
                is_admin, role, status, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            ) RETURNING id, email, first_name, last_name
        `, [
            'support@virtualaddresshub.co.uk',
            'Support',
            'Team',
            hashedPassword,
            'limited_company',
            'GB',
            'Virtual Address Hub Ltd',
            'Support',
            'Team',
            '123 Business Street',
            'London',
            'SW1A 1AA',
            'GB',
            true, // is_admin
            'admin', // role
            'active', // status
            Date.now(), // created_at
            Date.now()  // updated_at
        ]);

        console.log('✅ Support user created successfully!');
        console.log('User ID:', result.rows[0].id);
        console.log('Email:', result.rows[0].email);
        console.log('Name:', result.rows[0].first_name, result.rows[0].last_name);

    } catch (error) {
        console.error('❌ Error creating support user:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    createSupportUser();
}

module.exports = { createSupportUser };
