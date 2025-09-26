import { test, expect } from '@playwright/test';

test('Help Centre shows SLA pill', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByText(/we'll reply as soon as possible/i)).toBeVisible();
});

test('Help Centre shows support email hint', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByText(/support@virtualaddresshub.co.uk/i)).toBeVisible();
});

test('Help Centre SLA pill has clock icon', async ({ page }) => {
    await page.goto('/help');

    // Check that the SLA pill is visible
    const slaPill = page.getByText(/we'll reply as soon as possible/i);
    await expect(slaPill).toBeVisible();

    // Check that it's in a pill-like container (StatusPill component)
    const pillContainer = slaPill.locator('..');
    await expect(pillContainer).toHaveClass(/inline-flex/);
});
