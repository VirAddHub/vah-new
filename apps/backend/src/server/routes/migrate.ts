import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

/**
 * POST /api/migrate/fix-columns
 * Fix missing database columns (admin only)
 */
router.post('/fix-columns', async (req: Request, res: Response) => {
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

        const changes: string[] = [];

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
