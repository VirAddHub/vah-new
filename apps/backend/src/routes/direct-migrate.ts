import { Router, Request, Response } from 'express';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { getPgSslOption } from '../lib/pgSslConfig';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * POST /api/direct-migrate
 * Direct migration inline (admin only). Not mounted in production. Response omits table name lists.
 */
router.post('/direct-migrate', requireAdmin, async (req: Request, res: Response) => {
    try {
        console.log('🚀 Starting direct migrations...');
        
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return res.status(500).json({
                ok: false,
                error: 'DATABASE_URL not set'
            });
        }
        
        const client = new Client({
            connectionString: dbUrl,
            ssl: getPgSslOption(),
        });
        
        await client.connect();
        console.log('✅ Connected to database');
        
        // Check if forwarding tables already exist
        const checkResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'forwarding%' 
            ORDER BY table_name
        `);
        
        if (checkResult.rows.length >= 3) {
            console.log('✅ Forwarding tables already exist, skipping migrations');
            await client.end();
            return res.json({
                ok: true,
                message: 'Forwarding tables already exist',
                forwardingTablesSatisfied: true,
            });
        }
        
        console.log('📋 Forwarding tables not found, running migrations...');
        
        // Run migrations in order
        const migrations = [
            '025_forwarding_charges.sql',
            '026_enhanced_forwarding_system.sql', 
            '027_admin_forwarding_system.sql',
            '028_forwarding_perf.sql',
            '029_forwarding_trigger.sql'
        ];
        
        await client.query('BEGIN;');
        console.log('🔄 Started transaction');
        
        for (const migration of migrations) {
            const migrationPath = path.join(__dirname, '../../../migrations', migration);
            
            if (!fs.existsSync(migrationPath)) {
                console.error(`❌ Migration file not found: ${migrationPath}`);
                throw new Error(`Migration file not found: ${migration}`);
            }
            
            console.log(`📋 Running migration: ${migration}`);
            const sql = fs.readFileSync(migrationPath, 'utf8');
            await client.query(sql);
            console.log(`✅ Completed: ${migration}`);
        }
        
        await client.query('COMMIT;');
        console.log('✅ All migrations committed successfully');
        
        // Verify tables were created
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'forwarding%' 
            ORDER BY table_name
        `);
        
        console.log('📊 Created tables:', result.rows.map(r => r.table_name));
        
        await client.end();
        
        res.json({
            ok: true,
            message: 'Migrations completed successfully',
            forwardingTablesSatisfied: result.rows.length >= 3,
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        console.error('[Direct Migrate] Error:', error);
        res.status(500).json({
            ok: false,
            error: 'Migration failed',
            message: error.message
        });
    }
});

export default router;
