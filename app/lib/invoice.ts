// app/lib/invoice.ts
// Invoice utilities for frontend - synced from backend

export interface Invoice {
    id: number;
    number: string;
    amount_pence: number;
    currency: string;
    period_start: string;
    period_end: string;
    created_at: string;
    pdf_path?: string;
}

export interface InvoiceToken {
    token: string;
    expires_at: string;
}

/**
 * Format pence to GBP currency
 */
export function fmtGBP(pence: number): string {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
    }).format((pence || 0) / 100);
}

/**
 * Generate invoice number format
 */
export function mkInvoiceNumber(createdAt: string | Date, seq: number): string {
    const y = new Date(createdAt).getFullYear();
    return `VAH-${y}-${String(seq).padStart(6, '0')}`;
}

/**
 * Request invoice download token
 */
export async function requestInvoiceToken(invoiceId: number): Promise<InvoiceToken> {
    const response = await fetch(`/api/invoices/${invoiceId}/token`, {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Invoice token request failed: ${errorText}`);
    }

    return response.json();
}

/**
 * Download invoice PDF using token
 */
export async function downloadInvoice(token: string): Promise<Blob> {
    const response = await fetch(`/api/invoices/${token}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to download invoice');
    }

    return response.blob();
}

/**
 * Get user's invoices
 */
export async function getUserInvoices(): Promise<Invoice[]> {
    const response = await fetch('/api/billing/invoices', {
        credentials: 'include',
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch invoices: ${errorText}`);
    }

    return response.json();
}

/**
 * Format date for display
 */
export function formatInvoiceDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Format billing period
 */
export function formatBillingPeriod(start: string, end: string): string {
    const startDate = formatInvoiceDate(start);
    const endDate = formatInvoiceDate(end);
    return `${startDate} – ${endDate}`;
}
