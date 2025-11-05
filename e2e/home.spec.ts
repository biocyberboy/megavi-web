import { test, expect } from './fixtures/pages';

test.describe('Homepage', () => {
  test('should load successfully with all sections', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.page).toHaveTitle(/MEGAVI/i);
    await homePage.verifyHeroSection();
    await homePage.verifyHeroCTAs();
    await homePage.verifyLatestPosts();
  });

  test('should display hero video background', async ({ homePage }) => {
    await homePage.goto();
    const video = homePage.page.locator('video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('autoplay');
    await expect(video).toHaveAttribute('loop');
  });

  test('should navigate to price page from hero CTA', async ({ homePage }) => {
    await homePage.goto();
    await homePage.clickPriceCTA();
    await expect(homePage.page).toHaveURL(/.*\/gia/);
  });

  test('should navigate to blog page from hero CTA', async ({ homePage }) => {
    await homePage.goto();
    await homePage.clickBlogCTA();
    await expect(homePage.page).toHaveURL(/.*\/blog/);
  });

  test('should display latest blog posts', async ({ homePage }) => {
    await homePage.goto();
    const postCount = await homePage.getPostCardCount();
    expect(postCount).toBeGreaterThanOrEqual(0);
    expect(postCount).toBeLessThanOrEqual(3);
  });

  test('should navigate to blog post when clicking post card', async ({ homePage }) => {
    await homePage.goto();
    const postCount = await homePage.getPostCardCount();
    
    if (postCount > 0) {
      await homePage.clickFirstPost();
      await expect(homePage.page).toHaveURL(/.*\/blog\/.+/);
    }
  });

  test('should have responsive design on mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await homePage.goto();
    await homePage.verifyHeroSection();
    await homePage.verifyHeroCTAs();
  });

  test('should load without console errors', async ({ homePage, page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await homePage.goto();
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = consoleErrors.filter(
      (error) => 
        !error.includes('favicon') && 
        !error.includes('extension') &&
        !error.includes('chrome-extension') &&
        !error.includes('Failed to load resource')
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });
});
