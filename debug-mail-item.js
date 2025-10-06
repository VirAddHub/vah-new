#!/usr/bin/env node

/**
 * Debug script to check what's in the database for mail item 25
 * This will help us understand why the OneDrive download is failing
 */

const { Client } = require('pg');

async function debugMailItem() {
    // Use environment variable for database URL
    const dbUrl = process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL;
    if (!dbUrl) {
        console.log('❌ No DATABASE_URL found. Set it as an environment variable.');
        console.log('   Example: DATABASE_URL="your_postgres_url" node debug-mail-item.js');
        return;
    }

    const client = new Client({
        connectionString: dbUrl
    });

    try {
        await client.connect();
        console.log('🔍 Debugging Mail Item 25');
        console.log('========================');
        console.log('');

        // Check mail item 25
        const mailResult = await client.query(`
            SELECT
                m.id,
                m.user_id,
                m.subject,
                m.scan_file_url,
                f.name as file_name,
                f.web_url as file_url,
                f.size as file_size
            FROM mail_item m
            LEFT JOIN file f ON f.id = m.file_id
            WHERE m.id = 25
        `);

        if (mailResult.rows.length === 0) {
            console.log('❌ Mail item 25 not found in database');
            return;
        }

        const mail = mailResult.rows[0];
        console.log('📧 Mail Item Details:');
        console.log(`   ID: ${mail.id}`);
        console.log(`   User ID: ${mail.user_id}`);
        console.log(`   Subject: ${mail.subject}`);
        console.log(`   Scan File URL: ${mail.scan_file_url}`);
        console.log(`   File Name: ${mail.file_name}`);
        console.log(`   File URL: ${mail.file_url}`);
        console.log(`   File Size: ${mail.file_size}`);
        console.log('');

        // Determine which URL to use
        const url = mail.file_url || mail.scan_file_url;
        if (!url) {
            console.log('❌ No file URL found for this mail item');
            return;
        }

        console.log('🔗 Using URL:', url);
        console.log('');

        // Test URL parsing
        try {
            const urlObj = new URL(url);
            console.log('📋 URL Analysis:');
            console.log(`   Host: ${urlObj.host}`);
            console.log(`   Pathname: ${urlObj.pathname}`);
            console.log('');

            // Test path extraction
            const SITE_PATH = '/personal/ops_virtualaddresshub_co_uk';
            const expectedPrefix = SITE_PATH;

            if (urlObj.pathname.startsWith(expectedPrefix + "/")) {
                const rest = urlObj.pathname.slice(expectedPrefix.length + 1);
                const drivePath = decodeURIComponent(rest.replace(/^\/+/, ""));
                console.log('✅ Drive Path Extracted:', drivePath);
                console.log('');

                // Test UPN extraction
                const alias = SITE_PATH.replace('/personal/', '');
                const parts = alias.split('_').filter(Boolean);
                const user = parts.shift();
                const domain = parts.join('.');
                const upn = `${user}@${domain}`;

                console.log('👤 UPN Analysis:');
                console.log(`   Alias: ${alias}`);
                console.log(`   User: ${user}`);
                console.log(`   Domain: ${domain}`);
                console.log(`   UPN: ${upn}`);
                console.log('');

                // Test Graph API URL construction
                const encodedPath = drivePath
                    .split("/")
                    .filter(Boolean)
                    .map(seg => encodeURIComponent(seg))
                    .join("/");

                const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive/root:/${encodedPath}:/content`;
                console.log('🌐 Graph API URL:');
                console.log(`   ${graphUrl}`);
                console.log('');

                console.log('🧪 Next Steps:');
                console.log('1. Check if this file exists in OneDrive:');
                console.log(`   https://virtualaddresshubcouk-my.sharepoint.com/personal/ops_virtualaddresshub_co_uk/${drivePath}`);
                console.log('');
                console.log('2. Test the Graph API URL with your token:');
                console.log(`   curl -H "Authorization: Bearer YOUR_TOKEN" "${graphUrl}"`);
                console.log('');
                console.log('3. If the file doesn\'t exist, check what files are actually in:');
                console.log('   Documents/Scanned_Mail/ folder in OneDrive');

            } else {
                console.log('❌ URL does not start with expected prefix:', expectedPrefix);
                console.log('   This might be a different type of URL (not OneDrive personal)');
            }

        } catch (urlError) {
            console.log('❌ URL parsing failed:', urlError.message);
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await client.end();
    }
}

debugMailItem();
