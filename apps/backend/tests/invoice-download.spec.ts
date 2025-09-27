import { test, expect } from '@playwright/test';

test('invoice link is single-use (second = 410)', async ({ request }) => {
    // Use backend API directly for testing
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

    const linkRes = await request.post(`${backendUrl}/api/admin/invoices/1/link`, {
        headers: {
            'X-Dev-Admin': '1'
        }
    });

    expect(linkRes.ok()).toBeTruthy();
    const { token } = await linkRes.json();

    // Test the Next.js proxy for invoice download
    const first = await request.get(`/api/invoices/${token}`);
    expect(first.status()).toBe(200);
    expect(first.headers()['content-type']).toMatch(/application\/pdf/);

    const second = await request.get(`/api/invoices/${token}`);
    expect(second.status()).toBe(410);
});
