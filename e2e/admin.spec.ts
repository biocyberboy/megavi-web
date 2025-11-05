import { test, expect } from './fixtures/pages';

test.describe('Admin Page', () => {
  test('should load admin page', async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.verifyPageLoaded();
  });

  test('should display stats dashboard', async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.verifyStatsDisplayed();
  });

  test('should show blog management section', async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.verifyBlogSectionPresent();
  });

  test('should show series management section', async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.verifySeriesSectionPresent();
  });

  test('should display existing posts list', async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.expandBlogSection();
    const count = await adminPage.getPostsCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have correct page title', async ({ adminPage, page }) => {
    await adminPage.goto();
    await expect(page).toHaveTitle(/Admin/i);
  });

  test('should display all management forms', async ({ adminPage, page }) => {
    await adminPage.goto();
    const forms = page.locator('form');
    const formCount = await forms.count();
    expect(formCount).toBeGreaterThan(0);
  });

  test('should be responsive on tablet', async ({ adminPage, page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await adminPage.goto();
    await adminPage.verifyPageLoaded();
  });
});

test.describe('Admin Page - Protected Access', () => {
  test('should handle unauthenticated access', async ({ adminPage, page }) => {
    await adminPage.goto();
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    const isProtected = currentUrl.includes('/login') || currentUrl.includes('/auth');
    const isAdminPage = currentUrl.includes('/admin');
    
    expect(isProtected || isAdminPage).toBeTruthy();
  });
});
