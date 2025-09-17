/* eslint-disable no-console */
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createUsers() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ Please set DATABASE_URL environment variable');
        console.log('Example: DATABASE_URL="postgresql://user:pass@host:port/dbname" node create-users-node.mjs');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('🔌 Connected to Postgres database');

        // Read and execute the SQL file
        const sqlFile = join(__dirname, 'create-users-direct.sql');
        const sql = readFileSync(sqlFile, 'utf8');

        console.log('🚀 Creating admin and worker users...');
        const result = await client.query(sql);

        console.log('✅ Users created successfully!');
        console.log('\n📋 User credentials:');
        console.log('Admin: admin@yourdomain.com / CHANGE_ME_AFTER_FIRST_LOGIN');
        console.log('Worker: worker@yourdomain.com / CHANGE_ME_AFTER_FIRST_LOGIN');

        // Show the created users
        if (result.rows && result.rows.length > 0) {
            console.log('\n👥 Created users:');
            result.rows.forEach(user => {
                console.log(`- ${user.email} (${user.first_name} ${user.last_name}) - ${user.role}`);
            });
        }

    } catch (error) {
        console.error('❌ Error creating users:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

createUsers();
