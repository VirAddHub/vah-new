// server/services/invoice.ts
// Invoice generation service for GoCardless payments

import { getPool } from '../db';
import { nanoid } from 'nanoid';

export interface InvoiceData {
    user: any;
    plan: any;
    gcPayment: {
        id: string;
        amount: number; // in pence
        charge_date: string;
    };
}

export interface Invoice {
    id: number;
    user_id: number;
    amount_pence: number;
    period_start: string;
    period_end: string;
    token: string;
    created_at: string;
}

export async function createInvoiceFromPayment(data: InvoiceData): Promise<Invoice> {
    const { user, plan, gcPayment } = data;
    const pool = getPool();

    // Calculate billing period (assuming monthly billing)
    const chargeDate = new Date(gcPayment.charge_date);
    const periodStart = new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 1);
    const periodEnd = new Date(chargeDate.getFullYear(), chargeDate.getMonth() + 1, 0);

    // Generate unique token for invoice access
    const token = nanoid(32);

    // Insert invoice into database using PostgreSQL
    const result = await pool.query(`
        INSERT INTO invoices (
            user_id,
            amount_pence,
            period_start,
            period_end,
            token,
            status,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, 'paid', $6)
        RETURNING *
    `, [
        user.id,
        gcPayment.amount,
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0],
        token,
        new Date().toISOString()
    ]);

    // Return the created invoice
    return result.rows[0] as Invoice;
}

export async function getInvoiceByToken(token: string): Promise<Invoice | null> {
    const pool = getPool();
    const result = await pool.query(`
        SELECT * FROM invoices WHERE token = $1 AND status = 'paid'
    `, [token]);

    return result.rows[0] || null;
}

export async function getUserInvoices(userId: number): Promise<Invoice[]> {
    const pool = getPool();
    const result = await pool.query(`
        SELECT * FROM invoices
        WHERE user_id = $1
        ORDER BY created_at DESC
    `, [userId]);

    return result.rows;
}
