import { test, expect } from '@playwright/test';

test.describe('Quick Smoke Test', () => {
  test('app should be running and accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MEGAVI/i);
    await expect(page.locator('body')).toBeVisible();
  });
});
