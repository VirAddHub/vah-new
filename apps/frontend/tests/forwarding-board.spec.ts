import { test, expect } from "@playwright/test";

test("Start Processing moves card to In Progress", async ({ page }) => {
  // Navigate to admin forwarding page
  await page.goto("/admin/forwarding");

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Find first Requested card
  const requestedColumn = page.locator('[data-testid="forwarding-column"][data-stage="Requested"]');
  const requestedCard = requestedColumn.locator('[data-testid="forwarding-card"]').first();
  
  // Check if there are any requested items
  const requestedCount = await requestedColumn.locator('[data-testid="forwarding-card"]').count();
  
  if (requestedCount === 0) {
    test.skip("No requested items to test with");
    return;
  }

  await expect(requestedCard).toBeVisible();

  // Click Start Processing button
  await requestedCard.getByRole("button", { name: /start processing/i }).click();

  // Wait for the optimistic update to take effect
  await page.waitForTimeout(1000);

  // The card should disappear from Requested column
  await expect(requestedCard).toHaveCount(0);

  // And appear under In Progress column
  const inProgressColumn = page.locator('[data-testid="forwarding-column"][data-stage="In Progress"]');
  const inProgressCard = inProgressColumn.locator('[data-testid="forwarding-card"]').first();
  
  await expect(inProgressCard).toBeVisible();
  
  // Verify the card shows "In Progress" status
  await expect(inProgressCard.locator('[data-testid="status-badge"]')).toContainText("In Progress");
});

test("Status badges show correct UI stages", async ({ page }) => {
  await page.goto("/admin/forwarding");
  await page.waitForLoadState('networkidle');

  // Check that all status badges show UI stages, not canonical statuses
  const statusBadges = page.locator('[data-testid="status-badge"]');
  const count = await statusBadges.count();
  
  for (let i = 0; i < count; i++) {
    const badge = statusBadges.nth(i);
    const text = await badge.textContent();
    
    // Should only show UI stages, not canonical statuses
    expect(text).toMatch(/^(Requested|In Progress|Done)$/);
    expect(text).not.toMatch(/^(Processing|Dispatched|Delivered)$/);
  }
});

test("Other column appears for unexpected statuses", async ({ page }) => {
  await page.goto("/admin/forwarding");
  await page.waitForLoadState('networkidle');

  // Check if Other column exists (it should only appear if there are unexpected statuses)
  const otherColumn = page.locator('[data-testid="forwarding-column"][data-stage="Other"]');
  const otherExists = await otherColumn.count() > 0;
  
  if (otherExists) {
    // If Other column exists, it should show unexpected statuses
    const otherCards = otherColumn.locator('[data-testid="forwarding-card"]');
    const count = await otherCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = otherCards.nth(i);
      const statusText = await card.locator('[data-testid="status-text"]').textContent();
      
      // Should show the raw status, not a UI stage
      expect(statusText).not.toMatch(/^(Requested|In Progress|Done)$/);
    }
  }
});
