import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { getPool } from '../db';

const router = Router();

/**
 * POST /api/debug/fix-forwarding-addresses
 * Admin endpoint to fix forwarding addresses for existing users
 */
router.post('/fix-forwarding-addresses', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();

    try {
        console.log('🔧 Fixing forwarding addresses for existing users...');

        // Find users who have individual address fields but no forwarding_address
        const usersToFix = await pool.query(`
            SELECT 
                id, 
                email, 
                first_name, 
                last_name,
                forward_to_first_name,
                forward_to_last_name,
                address_line1,
                address_line2,
                city,
                postcode,
                forward_country
            FROM "user" 
            WHERE forwarding_address IS NULL 
            AND forward_to_first_name IS NOT NULL 
            AND address_line1 IS NOT NULL 
            AND city IS NOT NULL 
            AND postcode IS NOT NULL
        `);

        console.log(`📊 Found ${usersToFix.rows.length} users to fix`);

        const results = [];

        for (const user of usersToFix.rows) {
            // Reconstruct forwarding address from individual fields
            const forwardingAddress = `${user.forward_to_first_name} ${user.forward_to_last_name}\n${user.address_line1}${user.address_line2 ? '\n' + user.address_line2 : ''}\n${user.city}, ${user.postcode}\n${user.forward_country}`;

            console.log(`👤 Fixing user ${user.id} (${user.email})`);

            // Update the user with the reconstructed forwarding address
            await pool.query(`
                UPDATE "user" 
                SET forwarding_address = $1, updated_at = $2
                WHERE id = $3
            `, [forwardingAddress, Date.now(), user.id]);

            results.push({
                id: user.id,
                email: user.email,
                forwarding_address: forwardingAddress
            });
        }

        // Verify the fix
        const verifyResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM "user" 
            WHERE forwarding_address IS NOT NULL
        `);

        console.log(`✅ Verification: ${verifyResult.rows[0].count} users now have forwarding addresses`);

        return res.json({
            ok: true,
            message: `Fixed forwarding addresses for ${results.length} users`,
            data: {
                fixed_users: results.length,
                total_users_with_addresses: verifyResult.rows[0].count,
                details: results
            }
        });

    } catch (error: any) {
        console.error('[POST /api/debug/fix-forwarding-addresses] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
