// Optimized forwarding update controller with better performance
import { Request, Response } from 'express';
import { getPool } from '../../server/db';
import { sendMailForwarded } from '../../lib/mailer';

const ACTION_TO_STATUS = {
    mark_reviewed: 'Reviewed',
    start_processing: 'Processing',
    mark_dispatched: 'Dispatched',
    mark_delivered: 'Delivered',
    cancel: 'Cancelled'
};

const canMove = (from: string, to: string): boolean => {
    const transitions: Record<string, string[]> = {
        'Requested': ['Reviewed', 'Cancelled'],
        'Reviewed': ['Processing', 'Cancelled'],
        'Processing': ['Dispatched', 'Cancelled'],
        'Dispatched': ['Delivered', 'Cancelled'],
        'Delivered': [], // Terminal state
        'Cancelled': [] // Terminal state
    };
    return transitions[from]?.includes(to) || false;
};

export async function adminUpdateForwardingOptimized(req: Request, res: Response) {
    const admin = req.user;
    if (!admin) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const id = Number(req.params.id);
    const { action, courier, tracking_number, admin_notes } = req.body ?? {};
    const nextStatus = ACTION_TO_STATUS[action as keyof typeof ACTION_TO_STATUS];

    if (!nextStatus) {
        return res.status(400).json({ ok: false, error: 'invalid_action' });
    }

    try {
        const pool = getPool();
        
        // Start transaction for atomic operations
        await pool.query('BEGIN');

        try {
            // Single query to get current state and validate
            const currentResult = await pool.query(`
                SELECT fr.id, fr.status, fr.mail_item_id, fr.user_id,
                       mi.subject, mi.tag,
                       u.email, u.first_name, u.last_name,
                       fr.to_name, fr.address1, fr.address2, fr.city, fr.state, fr.postal, fr.country
                FROM forwarding_request fr
                JOIN mail_item mi ON mi.id = fr.mail_item_id
                JOIN "user" u ON u.id = fr.user_id
                WHERE fr.id = $1
            `, [id]);

            if (currentResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ ok: false, error: 'not_found' });
            }

            const current = currentResult.rows[0];
            
            if (!canMove(current.status, nextStatus)) {
                await pool.query('ROLLBACK');
                return res.status(400).json({
                    ok: false,
                    error: 'illegal_transition',
                    from: current.status,
                    to: nextStatus
                });
            }

            // Build optimized update query with all fields at once
            const now = Date.now();
            const updateFields: string[] = ['status = $1', 'updated_at = $2'];
            const updateValues: any[] = [nextStatus, now];
            let paramIndex = 3;

            // Add status-specific timestamps
            switch (nextStatus) {
                case 'Reviewed':
                    updateFields.push(`reviewed_at = $${paramIndex}`, `reviewed_by = $${paramIndex + 1}`);
                    updateValues.push(now, admin.id);
                    paramIndex += 2;
                    break;
                case 'Processing':
                    updateFields.push(`processing_at = $${paramIndex}`);
                    updateValues.push(now);
                    paramIndex += 1;
                    break;
                case 'Dispatched':
                    updateFields.push(`dispatched_at = $${paramIndex}`);
                    updateValues.push(now);
                    paramIndex += 1;
                    break;
                case 'Delivered':
                    updateFields.push(`delivered_at = $${paramIndex}`);
                    updateValues.push(now);
                    paramIndex += 1;
                    break;
                case 'Cancelled':
                    updateFields.push(`cancelled_at = $${paramIndex}`);
                    updateValues.push(now);
                    paramIndex += 1;
                    break;
            }

            // Add optional fields
            if (courier !== undefined) {
                updateFields.push(`courier = $${paramIndex}`);
                updateValues.push(courier);
                paramIndex += 1;
            }
            if (tracking_number !== undefined) {
                updateFields.push(`tracking_number = $${paramIndex}`);
                updateValues.push(tracking_number);
                paramIndex += 1;
            }
            if (admin_notes !== undefined) {
                updateFields.push(`admin_notes = $${paramIndex}`);
                updateValues.push(admin_notes);
                paramIndex += 1;
            }

            // Add WHERE clause
            updateValues.push(id);

            // Execute the main update
            const updateResult = await pool.query(
                `UPDATE forwarding_request SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                updateValues
            );

            // Update mail_item status in the same transaction
            await pool.query(
                'UPDATE mail_item SET forwarding_status = $1, updated_at = $2 WHERE id = $3',
                [nextStatus, now, current.mail_item_id]
            );

            // Insert audit log
            await pool.query(
                `INSERT INTO mail_event(mail_item_id, user_id, event, meta_json, created_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    current.mail_item_id,
                    admin.id,
                    `forwarding.${nextStatus.toLowerCase()}`,
                    JSON.stringify({ courier, tracking_number, admin_notes }),
                    now
                ]
            );

            // Add usage charges for Processing status (in transaction)
            if (nextStatus === 'Processing') {
                const month = new Date();
                month.setDate(1);
                month.setHours(0, 0, 0, 0);
                const yyyymm = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

                await pool.query(`
                    INSERT INTO usage_charges (user_id, period_yyyymm, type, qty, amount_pence, notes, created_at)
                    VALUES ($1, $2, 'forwarding', 1, 200, 'Handling fee', $3)
                `, [current.user_id, yyyymm, now]);
            }

            // Commit the transaction
            await pool.query('COMMIT');

            // Send email notifications asynchronously (non-blocking)
            if (nextStatus === 'Dispatched' || nextStatus === 'Delivered') {
                setImmediate(async () => {
                    try {
                        // Build forwarding address
                        const addressParts = [
                            current.to_name,
                            current.address1,
                            current.address2,
                            current.city,
                            current.state,
                            current.postal,
                            current.country
                        ].filter(Boolean);
                        
                        const forwarding_address = addressParts.length > 0 
                            ? addressParts.join(', ') 
                            : 'Your forwarding address';

                        await sendMailForwarded({
                            email: current.email,
                            name: current.first_name || current.email,
                            forwarding_address: forwarding_address,
                            forwarded_date: new Date().toLocaleDateString('en-GB')
                        });

                        console.log(`[AdminForwarding] Sent ${nextStatus.toLowerCase()} notification to ${current.email} for request ${id}`);
                    } catch (emailError) {
                        console.error(`[AdminForwarding] Failed to send ${nextStatus.toLowerCase()} email for request ${id}:`, emailError);
                    }
                });
            }

            console.log(`[AdminForwarding] Updated request ${id} to ${nextStatus} by admin ${admin.id}`);
            return res.json({ ok: true, data: updateResult.rows[0] });

        } catch (transactionError) {
            await pool.query('ROLLBACK');
            throw transactionError;
        }

    } catch (error) {
        console.error('[AdminForwarding] Update error:', error);
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
}
