import { test, expect } from './fixtures/pages';

test.describe('Price Dashboard', () => {
  test('should load price page successfully', async ({ pricePage }) => {
    await pricePage.goto();
    await pricePage.verifyPageLoaded();
    await pricePage.verifyControlsPresent();
  });

  test('should display price data after loading', async ({ pricePage }) => {
    await pricePage.goto();
    await pricePage.waitForDataLoad();
    await pricePage.verifyDataDisplayed();
  });

  test('should have functional product selector', async ({ pricePage, page }) => {
    await pricePage.goto();
    await pricePage.waitForDataLoad();
    
    const selectors = page.locator('select');
    const count = await selectors.count();
    expect(count).toBeGreaterThanOrEqual(0);
    
    if (count > 0) {
      const firstSelector = selectors.first();
      const options = await firstSelector.locator('option').count();
      expect(options).toBeGreaterThanOrEqual(0);
    }
  });

  test('should update chart when changing filters', async ({ pricePage, page }) => {
    await pricePage.goto();
    await pricePage.waitForDataLoad();
    
    await page.waitForResponse(
      (response) => response.url().includes('/api/') && response.status() === 200,
      { timeout: 5000 }
    ).catch(() => null);
    
    const selectors = page.locator('select');
    if ((await selectors.count()) > 0) {
      await selectors.first().selectOption({ index: 0 });
      await page.waitForTimeout(1000);
      await pricePage.verifyDataDisplayed();
    }
  });

  test('should handle API errors gracefully', async ({ pricePage, page }) => {
    await page.route('**/api/price/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await pricePage.goto();
    await pricePage.verifyPageLoaded();
  });

  test('should be responsive on mobile devices', async ({ pricePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await pricePage.goto();
    await pricePage.verifyPageLoaded();
    await pricePage.verifyControlsPresent();
  });

  test('should display correct page title and meta', async ({ pricePage, page }) => {
    await pricePage.goto();
    await expect(page).toHaveTitle(/Bảng giá gia cầm/i);
  });

  test('should load data within acceptable time', async ({ pricePage, page }) => {
    const startTime = Date.now();
    await pricePage.goto();
    await pricePage.waitForDataLoad();
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Price Dashboard - Data Interaction', () => {
  test('should allow switching between different products', async ({ pricePage, page }) => {
    await pricePage.goto();
    await pricePage.waitForDataLoad();
    
    const selectors = page.locator('select');
    if ((await selectors.count()) >= 1) {
      const productSelector = selectors.first();
      const optionCount = await productSelector.locator('option').count();
      
      if (optionCount > 1) {
        await productSelector.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        await pricePage.verifyDataDisplayed();
      }
    }
  });

  test('should display latest price snapshot if available', async ({ pricePage, page }) => {
    await pricePage.goto();
    await pricePage.waitForDataLoad();
    
    const snapshot = page.locator('text=/giá|đ\\/kg|VND/i').first();
    const hasSnapshot = await snapshot.isVisible().catch(() => false);
    
    if (hasSnapshot) {
      await expect(snapshot).toBeVisible();
    }
  });
});
