#!/usr/bin/env node
/* eslint-disable no-console */
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!/^postgres/i.test(DATABASE_URL || '')) {
    console.error('[hotfix] DATABASE_URL is not Postgres');
    process.exit(1);
}

(async () => {
    const client = new Client({ 
        connectionString: DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
    });
    
    try {
        await client.connect();
        console.log('[hotfix] Connected to PostgreSQL');
        
        // Add missing amount_pence column to plans table
        console.log('[hotfix] Adding amount_pence column to plans table...');
        await client.query(`
            ALTER TABLE IF EXISTS plans 
            ADD COLUMN IF NOT EXISTS amount_pence integer NOT NULL DEFAULT 0;
        `);
        console.log('[hotfix] ✅ Added amount_pence column to plans table');
        
        // Check if webhook_log table has the expected structure
        const { rows: webhookColumns } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='webhook_log' ORDER BY 1;
        `);
        
        const hasProvider = webhookColumns.some(row => row.column_name === 'provider');
        const hasReceivedAt = webhookColumns.some(row => row.column_name === 'received_at');
        
        if (!hasProvider || !hasReceivedAt) {
            console.log('[hotfix] webhook_log table needs structure update...');
            // Drop and recreate webhook_log table with correct structure
            await client.query('DROP TABLE IF EXISTS webhook_log CASCADE;');
            await client.query(`
                CREATE TABLE webhook_log (
                    id            bigserial PRIMARY KEY,
                    provider      text NOT NULL,
                    event_type    text,
                    status        text,
                    payload       jsonb,
                    received_at   timestamptz NOT NULL DEFAULT now()
                );
                CREATE INDEX idx_webhook_log_provider ON webhook_log(provider);
                CREATE INDEX idx_webhook_log_received_at ON webhook_log(received_at);
            `);
            console.log('[hotfix] ✅ Recreated webhook_log table with correct structure');
        } else {
            console.log('[hotfix] ✅ webhook_log table structure is correct');
        }
        
        console.log('[hotfix] ✅ Schema hotfix completed successfully');
        
    } catch (err) {
        console.error('[hotfix] ❌ Schema hotfix failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
})();
