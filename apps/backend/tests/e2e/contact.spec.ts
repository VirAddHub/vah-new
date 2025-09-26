import { test, expect } from '@playwright/test';

test('contact form happy path', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Subject').fill('Website enquiry');
    await page.getByLabel('Message').fill('Hello from Playwright!');
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText(/thanks|message sent/i)).toBeVisible();
    await expect(page.getByText(/as soon as possible/i)).toBeVisible();
});

test('blocks obvious spam via honeypot', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Full name').fill('Bot');
    await page.getByLabel('Email address').fill('bot@example.com');
    await page.getByLabel('Subject').fill('Spam');
    await page.getByLabel('Message').fill('Buy now');
    await page.locator('input[name="website"]').fill('http://spam');
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText(/something went wrong|spam/i)).toBeVisible();
});

test('validates required fields', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText(/please enter your name/i)).toBeVisible();
});

test('validates email format', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email address').fill('invalid-email');
    await page.getByLabel('Subject').fill('Test');
    await page.getByLabel('Message').fill('Test message');
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText(/valid email address/i)).toBeVisible();
});

test('shows status pill with SLA promise', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Subject').fill('Test');
    await page.getByLabel('Message').fill('Test message');
    await page.getByRole('button', { name: /send message/i }).click();

    // Wait for success state
    await expect(page.getByText(/message sent/i)).toBeVisible();

    // Check for status pill with SLA promise
    await expect(page.getByText(/we'll reply as soon as possible/i)).toBeVisible();
});
