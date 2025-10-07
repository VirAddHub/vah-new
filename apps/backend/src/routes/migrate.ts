import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

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

export default router;
