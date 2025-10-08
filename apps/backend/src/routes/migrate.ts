import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getPool } from '../server/db';

const execAsync = promisify(exec);
const router = Router();

/**
 * POST /api/migrate/run
 * Run database migrations
 * Body: { from?: number, to?: number, dryRun?: boolean }
 */
router.post('/migrate/run', async (req: Request, res: Response) => {
    try {
        const { from, to, dryRun = false } = req.body;

        // Build command
        let command = 'node dist/src/scripts/migrate-sql.js migrations';

        if (from) {
            command += ` --from=${from}`;
        }
        if (to) {
            command += ` --to=${to}`;
        }
        if (dryRun) {
            command += ' --dry-run';
        }

        console.log(`[Migration] Running command: ${command}`);

        const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            env: process.env
        });

        if (stderr) {
            console.error('[Migration] stderr:', stderr);
        }

        console.log('[Migration] stdout:', stdout);

        res.json({
            ok: true,
            message: 'Migration completed successfully',
            output: stdout,
            error: stderr || null
        });

    } catch (error: any) {
        console.error('[Migration] Error:', error);
        res.status(500).json({
            ok: false,
            error: 'Migration failed',
            message: error.message,
            output: error.stdout || '',
            stderr: error.stderr || ''
        });
    }
});

/**
 * GET /api/migrate/status
 * Check migration status
 */
router.get('/migrate/status', async (req: Request, res: Response) => {
    try {
        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();

        // Check if forwarding tables exist
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'forwarding%' 
            ORDER BY table_name
        `);

        await client.end();

        res.json({
            ok: true,
            tables: result.rows.map(r => r.table_name),
            migrationStatus: result.rows.length >= 3 ? 'complete' : 'pending'
        });

    } catch (error: any) {
        console.error('[Migration Status] Error:', error);
        res.status(500).json({
            ok: false,
            error: 'Failed to check migration status',
            message: error.message
        });
    }
});

/**
 * POST /api/migrate/fix-columns
 * Fix missing database columns (admin only)
 */
router.post('/migrate/fix-columns', async (req: Request, res: Response) => {
    const pool = getPool();

    try {
        console.log('🔧 Starting database column fix...');

        // Check current schema
        console.log('Checking current user table schema...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name IN ('deleted_at', 'updated_at', 'created_at', 'forwarding_address')
            ORDER BY column_name
        `);

        console.log('Current columns:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Check if deleted_at exists
        const deletedAtExists = result.rows.some(row => row.column_name === 'deleted_at');
        const forwardingAddressExists = result.rows.some(row => row.column_name === 'forwarding_address');

        console.log(`deleted_at column exists: ${deletedAtExists}`);
        console.log(`forwarding_address column exists: ${forwardingAddressExists}`);

        const changes = [];

        // Add missing columns
        if (!deletedAtExists) {
            console.log('Adding deleted_at column...');
            await pool.query('ALTER TABLE "user" ADD COLUMN deleted_at bigint');
            changes.push('added deleted_at column');
            console.log('✅ deleted_at column added successfully');
        } else {
            console.log('✅ deleted_at column already exists');
        }

        if (!forwardingAddressExists) {
            console.log('Adding forwarding_address column...');
            await pool.query('ALTER TABLE "user" ADD COLUMN forwarding_address text');
            changes.push('added forwarding_address column');
            console.log('✅ forwarding_address column added successfully');
        } else {
            console.log('✅ forwarding_address column already exists');
        }

        // Verify the changes
        console.log('Verifying changes...');
        const verifyResult = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name IN ('deleted_at', 'forwarding_address')
            ORDER BY column_name
        `);

        console.log('Updated columns:');
        verifyResult.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        console.log('✅ Database schema updated successfully!');

        return res.json({
            ok: true,
            message: 'Database schema updated successfully',
            changes: changes.length > 0 ? changes : ['No changes needed - all columns already exist']
        });

    } catch (error: any) {
        console.error('❌ Migration error:', error.message);
        console.error('Full error:', error);
        return res.status(500).json({
            ok: false,
            error: 'migration_failed',
            message: error.message
        });
    }
});

export default router;
