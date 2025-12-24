const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection - use the same as the server
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/vah_db', // pragma: allowlist secret
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestMail() {
    try {
        console.log('Creating test mail items with downloadable files...');

        // First, get the regular user ID
        const userResult = await pool.query(`
      SELECT id FROM "user" WHERE email = 'user@virtualaddresshub.co.uk'
    `);

        if (userResult.rows.length === 0) {
            console.log('❌ Regular user not found. Please run create_test_users.js first.');
            return;
        }

        const userId = userResult.rows[0].id;
        console.log('✅ Found user ID:', userId);

        const now = Date.now();
        const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days from now

        // Create test files first
        const testFiles = [
            {
                name: 'HMRC_Tax_Return_2024.pdf',
                mime: 'application/pdf',
                size: 1024 * 1024, // 1MB
                drive_id: 'test_drive_1',
                item_id: 'test_item_1',
                path: '/test/hmrc_tax_return.pdf',
                web_url: 'https://vah-api-staging.onrender.com/api/test/download/hmrc_tax_return.pdf'
            },
            {
                name: 'Companies_House_Confirmation.pdf',
                mime: 'application/pdf',
                size: 512 * 1024, // 512KB
                drive_id: 'test_drive_2',
                item_id: 'test_item_2',
                path: '/test/companies_house_confirmation.pdf',
                web_url: 'https://vah-api-staging.onrender.com/api/test/download/companies_house_confirmation.pdf'
            },
            {
                name: 'Bank_Statement_September.pdf',
                mime: 'application/pdf',
                size: 2 * 1024 * 1024, // 2MB
                drive_id: 'test_drive_3',
                item_id: 'test_item_3',
                path: '/test/bank_statement.pdf',
                web_url: 'https://vah-api-staging.onrender.com/api/test/download/bank_statement.pdf'
            }
        ];

        const fileIds = [];

        for (const fileData of testFiles) {
            const fileResult = await pool.query(`
        INSERT INTO file (
          user_id, name, mime, size, drive_id, item_id, path, web_url,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) ON CONFLICT (drive_id, item_id) DO UPDATE SET
          web_url = EXCLUDED.web_url,
          updated_at = EXCLUDED.updated_at
        RETURNING id
      `, [
                userId,
                fileData.name,
                fileData.mime,
                fileData.size,
                fileData.drive_id,
                fileData.item_id,
                fileData.path,
                fileData.web_url,
                now,
                now
            ]);

            fileIds.push(fileResult.rows[0].id);
            console.log('✅ Created test file:', fileData.name, 'ID:', fileResult.rows[0].id);
        }

        // Create test mail items
        const testMailItems = [
            {
                subject: 'Self Assessment Tax Return 2024',
                sender_name: 'HM Revenue & Customs',
                sender_address: '100 Parliament Street, London SW1A 2BQ',
                description: 'Self Assessment Tax Return 2024',
                category: 'HMRC',
                status: 'scanned',
                file_id: fileIds[0],
                expires_at: expiresAt
            },
            {
                subject: 'Annual Confirmation Statement',
                sender_name: 'Companies House',
                sender_address: 'Crown Way, Cardiff CF14 3UZ',
                description: 'Annual Confirmation Statement',
                category: 'Companies House',
                status: 'scanned',
                file_id: fileIds[1],
                expires_at: expiresAt
            },
            {
                subject: 'Monthly Statement - September 2024',
                sender_name: 'Barclays Bank PLC',
                sender_address: '1 Churchill Place, London E14 5HP',
                description: 'Monthly Statement - September 2024',
                category: 'Bank',
                status: 'scanned',
                file_id: fileIds[2],
                expires_at: expiresAt
            }
        ];

        for (const mailData of testMailItems) {
            const mailResult = await pool.query(`
        INSERT INTO mail_item (
          user_id, subject, sender_name, sender_address, description,
          category, status, file_id, expires_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) ON CONFLICT (user_id, subject, sender_name) DO UPDATE SET
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          file_id = EXCLUDED.file_id,
          expires_at = EXCLUDED.expires_at,
          updated_at = EXCLUDED.updated_at
        RETURNING id
      `, [
                userId,
                mailData.subject,
                mailData.sender_name,
                mailData.sender_address,
                mailData.description,
                mailData.category,
                mailData.status,
                mailData.file_id,
                mailData.expires_at,
                now,
                now
            ]);

            console.log('✅ Created test mail item:', mailData.subject, 'ID:', mailResult.rows[0].id);
        }

        console.log('\n🎉 Test mail items created successfully!');
        console.log('\nYou can now test downloads by:');
        console.log('1. Login as user@virtualaddresshub.co.uk / UserPass123!');
        console.log('2. Go to the dashboard');
        console.log('3. Try downloading the test mail items');

    } catch (error) {
        console.error('❌ Error creating test mail:', error);
    } finally {
        await pool.end();
    }
}

createTestMail();
