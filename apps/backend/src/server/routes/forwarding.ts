// src/server/routes/forwarding.ts
// User-facing forwarding requests API

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { selectPaged } from '../db-helpers';
import { createForwardingRequest } from '../../modules/forwarding/forwarding.service';
import { extractUKPostcode, hasUKPostcode, normalizeUKPostcode, UK_POSTCODE_REGEX } from '../utils/ukPostcode';

const router = Router();
const pool = getPool();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

// Helper to normalize tags
const normalizeTag = (tag: string | null | undefined): string =>
    (tag || '').trim().toUpperCase();

/**
 * GET /api/forwarding/requests
 * List all forwarding requests for current user (with pagination support)
 * Query params: ?page=1&pageSize=20
 */
router.get('/forwarding/requests', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    try {
        const result = await selectPaged(
            `SELECT
                mi.id,
                mi.user_id,
                mi.item_id as letter_id,
                mi.sender_name,
                mi.description,
                mi.forwarding_status,
                mi.created_at as received_at,
                mi.updated_at
            FROM mail_item mi
            WHERE mi.user_id = $1 
            AND mi.forwarding_status IS NOT NULL 
            AND mi.forwarding_status != 'No'
            ORDER BY mi.created_at DESC`,
            [userId],
            page,
            pageSize
        );

        return res.json({ ok: true, ...result });
    } catch (error: any) {
        console.error('[GET /api/forwarding/requests] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/forwarding/requests/:id
 * Get specific forwarding request
 */
router.get('/forwarding/requests/:id', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const requestId = parseInt(req.params.id);

    if (!requestId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT
                fr.*,
                mi.item_id as letter_id,
                mi.sender_name,
                mi.created_at as received_at
            FROM forwarding_request fr
            LEFT JOIN mail_item mi ON fr.mail_item_id = mi.id
            WHERE fr.id = $1 AND fr.user_id = $2
        `, [requestId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/forwarding/requests/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/forwarding/requests
 * Create new forwarding request using stored forwarding address
 * Body: { mail_item_id, reason?, method? }
 * Returns: { ok: true, data: { forwarding_request, pricing, mail_tag, charge_amount } }
 */
router.post('/forwarding/requests', requireAuth, async (req: Request, res: Response) => {
    // First-line logging at the top
    console.log('[forwarding] incoming', {
        user_id: (req as any).user?.id,
        body_keys: Object.keys(req.body || {}),
        ids: req.body?.mail_item_ids,
        mail_item_id: req.body?.mail_item_id,
    });

    // DEBUG flag for troubleshooting
    if (process.env.DEBUG_FORWARDING === '1') {
        console.log('[forwarding] debug', {
            user: req.user?.id,
            payload: req.body,
            headers: req.headers
        });
    }

    const userId = req.user!.id as number;

    // Handle both payload formats: single mail_item_id or array mail_item_ids
    let mailItemIds: number[] = [];
    if (req.body?.mail_item_ids && Array.isArray(req.body.mail_item_ids)) {
        mailItemIds = req.body.mail_item_ids;
    } else if (req.body?.mail_item_id) {
        mailItemIds = [req.body.mail_item_id];
    }

    // Validate payload with clear error codes
    if (mailItemIds.length === 0) {
        console.warn('[forwarding] 400 bad payload', { mail_item_ids: req.body?.mail_item_ids, mail_item_id: req.body?.mail_item_id });
        return res.status(400).json({
            ok: false,
            error: 'bad_payload',
            reason: 'missing_mail_item_id',
            message: 'Missing required field: mail_item_id or mail_item_ids'
        });
    }

    // For now, handle only the first item (can be extended for bulk later)
    const mail_item_id = mailItemIds[0];

    try {
        // Get user's forwarding address and KYC status
        const userResult = await pool.query(`
            SELECT forwarding_address, first_name, last_name, kyc_status
            FROM "user" 
            WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            console.warn('[forwarding] 404 user not found', { userId });
            return res.status(404).json({
                ok: false,
                error: 'user_not_found',
                reason: 'user_not_found',
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Debug: Log user forwarding snapshot BEFORE parsing (don't log full address in production)
        const userFullResult = await pool.query(`
            SELECT id, email, first_name, last_name, forwarding_address
            FROM "user" 
            WHERE id = $1
        `, [userId]);
        const userFull = userFullResult.rows[0];
        const addressLinesCount = userFull.forwarding_address ? userFull.forwarding_address.split('\n').length : 0;
        const hasPostcodeInAddress = userFull.forwarding_address ? hasUKPostcode(userFull.forwarding_address) : false;
        console.log("[forwarding] user forwarding snapshot", {
            userId: userFull.id,
            email: userFull.email,
            address_lines_count: addressLinesCount,
            has_postcode_detected: hasPostcodeInAddress,
            // Don't log full address for privacy
        });

        if (!user.forwarding_address) {
            console.warn('[forwarding] 400 no forwarding address', { userId });
            return res.status(400).json({
                ok: false,
                error: 'no_forwarding_address',
                reason: 'missing_forwarding_address',
                message: 'Please add your forwarding address in Profile before requesting forwarding.'
            });
        }

        // Parse the stored forwarding address
        // Handle multiple formats:
        // Format 1 (with name): Name\nAddress1\nAddress2\nCity, Postcode\nCountry
        // Format 2 (no name): Address1\nAddress2\nCity\nPostcode
        // Format 3 (3 lines): Address1\nCity\nPostcode
        // Format 4 (5+ lines): Building\nAddress1\nAddress2\nCity\nPostcode
        const addressLines = user.forwarding_address.split('\n').filter((line: string) => line.trim() !== '');
        console.log("[forwarding] parsed address lines", {
            totalLines: addressLines.length,
            // Don't log full address lines for privacy
        });
        
        let name: string;
        let address1: string;
        let address2: string | undefined;
        let city: string;
        let postal: string;
        let country: string = 'GB'; // Default to GB for UK forwarding

        // Step 1: Find UK postcode in the address (check last 2-3 lines)
        // This is more reliable than guessing country codes
        let postcodeLineIndex = -1;
        let extractedPostcode: string | null = null;
        
        for (let i = Math.max(0, addressLines.length - 3); i < addressLines.length; i++) {
            const line = addressLines[i] || '';
            const found = extractUKPostcode(line);
            if (found) {
                postcodeLineIndex = i;
                extractedPostcode = found;
                break;
            }
        }
        
        // Step 2: Detect format based on postcode location and line count
        const firstLine = addressLines[0] || '';
        const firstLineHasNumbers = /\d/.test(firstLine);
        const lastLine = addressLines[addressLines.length - 1] || '';
        const hasPostcodeInLastLine = postcodeLineIndex === addressLines.length - 1;
        const hasPostcodeInSecondLastLine = postcodeLineIndex === addressLines.length - 2;
        
        // Check if last line might be country (only if no postcode found there)
        const mightBeCountryLine = !hasPostcodeInLastLine && 
            (lastLine.length <= 3 || ['GB', 'UK', 'United Kingdom', 'USA', 'US', 'England', 'Scotland', 'Wales'].includes(lastLine.toUpperCase()));
        
        if (postcodeLineIndex >= 0 && extractedPostcode) {
            // We found a postcode - use it as anchor point
            const postcodeLine = addressLines[postcodeLineIndex];
            
            // Extract city and postcode from the postcode line
            if (postcodeLine.includes(',')) {
                // City, Postcode format
                const parts = postcodeLine.split(',').map((s: string) => s.trim());
                city = parts.slice(0, -1).join(', '); // Everything except last part
                postal = normalizeUKPostcode(parts[parts.length - 1]) || extractedPostcode;
            } else {
                // Postcode might be standalone or mixed with city
                // Try to extract postcode and treat rest as city
                const withoutPostcode = postcodeLine.replace(UK_POSTCODE_REGEX, '').trim();
                city = withoutPostcode || (postcodeLineIndex > 0 ? addressLines[postcodeLineIndex - 1] : '') || '';
                postal = extractedPostcode;
            }
            
            // Determine address lines based on postcode position
            if (postcodeLineIndex === 0) {
                // Postcode is first line (unusual but handle it)
                name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                address1 = '';
                address2 = undefined;
            } else if (postcodeLineIndex === 1) {
                // Format: Address1\nPostcode (2 lines)
                name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                address1 = addressLines[0] || '';
                address2 = undefined;
            } else if (postcodeLineIndex === 2) {
                // Format: Address1\nCity\nPostcode (3 lines) OR Address1\nAddress2\nPostcode
                name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                address1 = addressLines[0] || '';
                // If city was extracted from postcode line, don't use addressLines[1] as city
                if (!city || city === addressLines[1]) {
                    address2 = undefined;
                } else {
                    address2 = addressLines[1] || undefined;
                }
            } else {
                // Format: Name/Address1\nAddress2\n...\nCity\nPostcode (4+ lines)
                // Check if first line looks like a name (no numbers) vs address (has numbers)
                if (!firstLineHasNumbers && addressLines.length >= 4) {
                    // Format 1: Name\nAddress1\nAddress2\n...\nCity\nPostcode
                    name = addressLines[0] || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                    address1 = addressLines[1] || '';
                    address2 = addressLines.length > 3 ? addressLines[2] : undefined;
                } else {
                    // Format 2: Address1\nAddress2\n...\nCity\nPostcode
                    name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                    address1 = addressLines[0] || '';
                    address2 = addressLines.length > 2 ? addressLines[1] : undefined;
                }
                
                // If country line exists and postcode is second-to-last
                if (mightBeCountryLine && hasPostcodeInSecondLastLine) {
                    country = lastLine;
                }
            }
        } else {
            // No postcode found - fallback to old logic (but this should rarely happen)
            console.warn('[forwarding] No UK postcode detected in address, using fallback parsing', {
                userId,
                addressLinesCount: addressLines.length,
            });
            
            name = firstLineHasNumbers ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : (addressLines[0] || `${user.first_name || ''} ${user.last_name || ''}`.trim());
            address1 = firstLineHasNumbers ? addressLines[0] : (addressLines[1] || '');
            address2 = addressLines.length > 2 ? addressLines[2] : undefined;
            
            if (addressLines.length >= 2) {
        const cityPostal = addressLines[addressLines.length - 2] || '';
                if (cityPostal.includes(',')) {
                    const parts = cityPostal.split(',').map((s: string) => s.trim());
                    city = parts.slice(0, -1).join(', ');
                    postal = parts[parts.length - 1];
                } else {
                    city = cityPostal;
                    postal = addressLines[addressLines.length - 1] || '';
                }
            } else {
                city = '';
                postal = '';
            }
            
            if (mightBeCountryLine) {
                country = lastLine;
            }
        }

        // Normalize postcode if we have one
        if (postal) {
            const normalized = normalizeUKPostcode(postal);
            if (normalized) {
                postal = normalized;
            }
        }

        console.log("[forwarding] extracted fields before validation", {
            hasName: !!name && name.trim() !== '',
            hasAddress1: !!address1 && address1.trim() !== '',
            hasAddress2: !!address2,
            hasCity: !!city && city.trim() !== '',
            hasPostcode: !!postal && postal.trim() !== '',
            postcodeNormalized: postal || null,
            detectedFormat: postcodeLineIndex >= 0 ? 'postcode_anchored' : 'fallback',
            postcodeLineIndex,
        });

        // Validate required fields for UK forwarding
        // Required: address1, city, postcode
        // Optional: address2, country (defaults to GB)
        // Name: falls back to user's first_name/last_name if missing
        const missingFields: string[] = [];
        
        // Name is optional (we use user's name as fallback)
        // Only require it if user doesn't have first_name/last_name
        if ((!name || name.trim() === '') && (!user.first_name && !user.last_name)) {
            missingFields.push('name');
        }
        
        if (!address1 || address1.trim() === '') {
            missingFields.push('address_line_1');
        }
        
        if (!city || city.trim() === '') {
            missingFields.push('city');
        }
        
        if (!postal || postal.trim() === '') {
            missingFields.push('postal_code');
        }
        
        // Country is optional (defaults to GB)
        // Don't require it

        if (missingFields.length > 0) {
            console.warn('[forwarding] Rejecting forwarding request - incomplete address', {
            userId,
                missingFields,
            hasName: !!name,
            hasAddress1: !!address1,
            hasCity: !!city,
            hasPostal: !!postal
        });
            return res.status(400).json({
                ok: false,
                error: 'forwarding_address_incomplete',
                fields: missingFields,
                message: `Your forwarding address is incomplete. Please update your profile with: ${missingFields.join(', ')}.`
            });
        }

        // All required fields are present
        const finalName = name.trim();
        const finalAddress1 = address1.trim();
        const finalCity = city.trim();
        const finalPostal = postal.trim();

        // Check KYC requirement before creating forwarding request
        // Get mail item to check tag
        const mailResult = await pool.query(`
            SELECT tag FROM mail_item WHERE id = $1 AND user_id = $2
        `, [mail_item_id, userId]);

        if (mailResult.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                error: 'mail_item_not_found',
                message: 'Mail item not found'
            });
        }

        const mailTag = mailResult.rows[0].tag;
        const { canForwardMail } = await import('../services/kyc-guards');
        if (!canForwardMail(user.kyc_status, mailTag)) {
            return res.status(403).json({
                ok: false,
                error: 'KYC_REQUIRED',
                message: 'You must complete identity verification (KYC) before we can forward this mail.',
            });
        }

        const result = await createForwardingRequest({
            userId,
            mailItemId: mail_item_id,
            to: {
                name: finalName,
                address1: finalAddress1,
                address2,
                city: finalCity,
                postal: finalPostal,
                country,
            },
            reason: req.body?.reason || null,
            method: req.body?.method || 'standard',
        });

        return res.status(200).json({
            ok: true,
            data: {
                forwarding_request: result.forwarding_request,
                request_id: result.request_id,
                created: result.created,
                message: result.message,
                charge_amount: result.charge_amount,
            },
        });
    } catch (e: any) {
        console.error('[POST /api/forwarding/requests] error:', e);

        // Handle GDPR expiration specifically
        if (e.message && e.message.includes('30 days')) {
            return res.status(403).json({
                ok: false,
                error: 'gdpr_expired',
                message: 'This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it.'
            });
        }

        return res.status(500).json({ ok: false, error: 'Failed to create forwarding request' });
    }
});

/**
 * POST /api/forwarding/requests/bulk
 * Bulk forward multiple mail items
 */
router.post('/requests/bulk', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ ok: false, error: 'invalid_ids' });
    }

    try {
        // Get user's KYC status
        const userResult = await pool.query(`
            SELECT kyc_status FROM "user" WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const userKycStatus = userResult.rows[0].kyc_status;
        const { canForwardMail } = await import('../services/kyc-guards');

        const forwarded: number[] = [];
        const errors: any[] = [];

        for (const id of ids) {
            try {
                const mailResult = await pool.query(`
                    SELECT id, user_id, tag
                    FROM mail_item
                    WHERE id = $1 AND user_id = $2 AND deleted = false
                `, [id, userId]);

                if (mailResult.rows.length === 0) {
                    errors.push({ id, error: 'not_found' });
                    continue;
                }

                const mailItem = mailResult.rows[0];

                // Check KYC requirement for forwarding (HMRC/Companies House always allowed)
                if (!canForwardMail(userKycStatus, mailItem.tag)) {
                    errors.push({ id, error: 'KYC_REQUIRED', message: 'KYC verification required' });
                    continue;
                }

                // Update mail item to mark as forwarding requested
                await pool.query(`
                    UPDATE mail_item
                    SET forwarding_status = $1, updated_at = $2
                    WHERE id = $3
                `, ['Requested', Date.now(), mailItem.id]);

                forwarded.push(id);
            } catch (error: any) {
                errors.push({ id, error: error.message });
            }
        }

        return res.json({ ok: true, forwarded, errors });
    } catch (error: any) {
        console.error('[POST /api/forwarding/requests/bulk] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
