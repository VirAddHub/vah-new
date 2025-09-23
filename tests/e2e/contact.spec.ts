import { test, expect } from '@playwright/test';

test('contact form happy path', async ({ page }) => {
    // Set API base for this test
    await page.goto('http://localhost:3000/support');

    // Fill out the contact form
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Subject').fill('Hello');
    await page.getByLabel('Message').fill('Just testing the contact form');

    // Honeypot should be hidden; do NOT fill it
    const websiteField = page.getByLabel('Website');
    await expect(websiteField).toBeHidden();

    // Submit the form
    await page.getByRole('button', { name: /send/i }).click();

    // Check for success message
    await expect(page.getByText(/thanks|received/i)).toBeVisible({ timeout: 5000 });
});

test('contact form honeypot protection', async ({ page }) => {
    await page.goto('http://localhost:3000/support');

    // Fill out the form normally
    await page.getByLabel('Name').fill('Spam Bot');
    await page.getByLabel('Email').fill('spam@example.com');
    await page.getByLabel('Subject').fill('Spam');
    await page.getByLabel('Message').fill('This is spam');

    // Try to fill the honeypot (this should trigger spam detection)
    await page.evaluate(() => {
        const websiteField = document.querySelector('input[name="website"]') as HTMLInputElement;
        if (websiteField) {
            websiteField.style.display = 'block';
            websiteField.value = 'http://spam.com';
        }
    });

    await page.getByRole('button', { name: /send/i }).click();

    // Should show spam error
    await expect(page.getByText(/spam detected/i)).toBeVisible({ timeout: 5000 });
});

test('contact form validation', async ({ page }) => {
    await page.goto('http://localhost:3000/support');

    // Try to submit empty form
    await page.getByRole('button', { name: /send/i }).click();

    // Should show validation errors or prevent submission
    // (exact behavior depends on your validation implementation)
    await expect(page.getByText(/required|missing/i)).toBeVisible({ timeout: 5000 });
});
