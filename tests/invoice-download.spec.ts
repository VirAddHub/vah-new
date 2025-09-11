import { test, expect } from '@playwright/test';

test('invoice link is single-use (second = 410)', async ({ request }) => {
    // Assume you have an auth cookie factory or are in a test user session
    const linkRes = await request.post('/api/bff/billing/invoices/1/link');
    expect(linkRes.ok()).toBeTruthy();
    const { token } = await linkRes.json();

    const first = await request.get(`/api/invoices/${token}`);
    expect(first.status()).toBe(200);
    expect(first.headers()['content-type']).toMatch(/application\/pdf/);

    const second = await request.get(`/api/invoices/${token}`);
    expect(second.status()).toBe(410);
});
