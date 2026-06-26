import { test, expect } from '@playwright/test';

test('Goal Creation Flow - creates a new goal', async ({ page }) => {
  await page.goto('/savings/create-goal');

  await page.fill('#goalName', 'Playwright Trip');
  await page.selectOption('#category', 'Travel');
  await page.fill('#targetAmount', '1500');

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.fill('#targetDate', tomorrow);
  await page.selectOption('#frequency', 'monthly');

  await page.click('button[type="submit"]');

  // The form resets on success and a success message with role=status appears
  await expect(page.locator('#create-goal-success')).toBeVisible({ timeout: 5000 });
});
