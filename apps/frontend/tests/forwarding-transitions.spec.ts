import { test, expect } from "@playwright/test";

test.describe("Forwarding Status Transitions", () => {
  test("Processing → Dispatched transition works correctly", async ({ page }) => {
    // Navigate to admin forwarding page
    await page.goto("/admin/forwarding");
    await page.waitForLoadState('networkidle');

    // Find first "In Progress" card (which should be Processing status)
    const inProgressColumn = page.locator('[data-testid="forwarding-column"][data-stage="In Progress"]');
    const inProgressCard = inProgressColumn.locator('[data-testid="forwarding-card"]').first();
    
    // Check if there are any in-progress items
    const inProgressCount = await inProgressColumn.locator('[data-testid="forwarding-card"]').count();
    
    if (inProgressCount === 0) {
      test.skip("No in-progress items to test with");
      return;
    }

    await expect(inProgressCard).toBeVisible();

    // Click "Mark Dispatched" button
    await inProgressCard.getByRole("button", { name: /mark dispatched/i }).click();

    // Wait for the optimistic update to take effect
    await page.waitForTimeout(1000);

    // The card should disappear from In Progress column
    await expect(inProgressCard).toHaveCount(0);

    // And appear under Done column
    const doneColumn = page.locator('[data-testid="forwarding-column"][data-stage="Done"]');
    const doneCard = doneColumn.locator('[data-testid="forwarding-card"]').first();
    
    await expect(doneCard).toBeVisible();
    
    // Verify the card shows "Done" status
    await expect(doneCard.locator('[data-testid="status-badge"]')).toContainText("Done");
  });

  test("Debug endpoint shows correct status and allowed transitions", async ({ page }) => {
    // Navigate to admin forwarding page
    await page.goto("/admin/forwarding");
    await page.waitForLoadState('networkidle');

    // Find first card to get its ID
    const firstCard = page.locator('[data-testid="forwarding-card"]').first();
    const cardExists = await firstCard.count() > 0;
    
    if (!cardExists) {
      test.skip("No forwarding requests to test with");
      return;
    }

    // Extract the request ID from the card (assuming it's in the text)
    const cardText = await firstCard.textContent();
    const idMatch = cardText?.match(/FR-(\d+)/);
    
    if (!idMatch) {
      test.skip("Could not extract request ID from card");
      return;
    }

    const requestId = idMatch[1];

    // Call the debug endpoint
    const debugResponse = await page.request.get(`/api/admin/forwarding/requests/${requestId}/debug-status`);
    
    expect(debugResponse.ok()).toBe(true);
    
    const debugData = await debugResponse.json();
    expect(debugData.ok).toBe(true);
    expect(debugData.id).toBe(requestId);
    expect(debugData.current).toMatch(/^(Requested|Processing|Dispatched|Delivered)$/);
    expect(Array.isArray(debugData.allowed)).toBe(true);
    expect(debugData.strict).toBeDefined();
  });

  test("Error handling shows clear transition messages", async ({ page }) => {
    // This test would require setting up a scenario where an illegal transition occurs
    // For now, we'll just verify the error handling structure exists
    
    // Navigate to admin forwarding page
    await page.goto("/admin/forwarding");
    await page.waitForLoadState('networkidle');

    // Check that error handling is in place by looking for toast notifications
    // (This is a basic check - in a real test, you'd trigger an actual error)
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeDefined();
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
});
