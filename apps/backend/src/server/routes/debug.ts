import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getPool } from '../db';

const router = Router();

/**
 * GET /api/debug/forwarding-address
 * Debug endpoint to check user's forwarding address data
 */
router.get('/forwarding-address', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT 
                id, 
                email, 
                first_name, 
                last_name,
                forwarding_address,
                forward_to_first_name,
                forward_to_last_name,
                address_line1,
                address_line2,
                city,
                postcode,
                forward_country
            FROM "user" 
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = result.rows[0];

        // Parse the forwarding address to see if it's valid
        let parsedAddress: any = null;
        let addressValid = false;
        let validationErrors: string[] = [];

        if (user.forwarding_address) {
            const addressLines = user.forwarding_address.split('\n').filter((line: string) => line.trim() !== '');
            const name = addressLines[0] || `${user.first_name || ''} ${user.last_name || ''}`.trim();
            const address1 = addressLines[1] || '';
            const address2 = addressLines[2] || undefined;
            const cityPostal = addressLines[addressLines.length - 2] || '';
            const country = addressLines[addressLines.length - 1] || 'GB';

            const [city, postal] = cityPostal.split(',').map((s: string) => s.trim());

            parsedAddress = {
                name,
                address1,
                address2,
                city,
                postal,
                country
            };

            // Check if all required fields are present
            if (!name) validationErrors.push('Missing name');
            if (!address1) validationErrors.push('Missing address line 1');
            if (!city) validationErrors.push('Missing city');
            if (!postal) validationErrors.push('Missing postal code');

            addressValid = validationErrors.length === 0;
        }

        return res.json({
            ok: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: `${user.first_name} ${user.last_name}`
                },
                forwarding_address_raw: user.forwarding_address,
                individual_fields: {
                    forward_to_first_name: user.forward_to_first_name,
                    forward_to_last_name: user.forward_to_last_name,
                    address_line1: user.address_line1,
                    address_line2: user.address_line2,
                    city: user.city,
                    postcode: user.postcode,
                    forward_country: user.forward_country
                },
                parsed_address: parsedAddress,
                address_valid: addressValid,
                validation_errors: validationErrors
            }
        });
    } catch (error: any) {
        console.error('[GET /api/debug/forwarding-address] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
