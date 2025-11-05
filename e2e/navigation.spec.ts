import { test, expect } from './fixtures/pages';

test.describe('Site Navigation', () => {
  test('should have working navbar on all pages', async ({ page }) => {
    const pages = ['/', '/gia', '/blog', '/admin'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      const navbar = page.locator('nav, header').first();
      await expect(navbar).toBeVisible();
    }
  });

  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    const giaLink = page.locator('a[href="/gia"]').first();
    if (await giaLink.isVisible()) {
      await giaLink.click();
      await expect(page).toHaveURL(/.*\/gia/);
    }
    
    const blogLink = page.locator('a[href="/blog"]').first();
    if (await blogLink.isVisible()) {
      await blogLink.click();
      await expect(page).toHaveURL(/.*\/blog/);
    }
  });

  test('should have working footer links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    
    if (await footer.isVisible()) {
      await expect(footer).toBeVisible();
      const footerLinks = footer.locator('a');
      const count = await footerLinks.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should maintain navigation state across page transitions', async ({ page }) => {
    await page.goto('/');
    await page.goto('/blog');
    await page.goBack();
    await expect(page).toHaveURL('/');
    
    await page.goForward();
    await expect(page).toHaveURL(/.*\/blog/);
  });
});

test.describe('User Journey - Complete Flow', () => {
  test('visitor can explore entire site', async ({ homePage, pricePage, blogPage, page }) => {
    await homePage.goto();
    await homePage.verifyHeroSection();
    
    await homePage.clickPriceCTA();
    await pricePage.verifyPageLoaded();
    await pricePage.waitForDataLoad();
    
    await page.goto('/blog');
    await blogPage.verifyPageLoaded();
    
    const postCount = await blogPage.getPostCount();
    if (postCount > 0) {
      await blogPage.clickPost(0);
      await expect(page).toHaveURL(/.*\/blog\/.+/);
    }
    
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('visitor can view price data and read related blog posts', async ({ page }) => {
    await page.goto('/gia');
    await page.waitForLoadState('networkidle');
    
    const blogLink = page.locator('a[href="/blog"]').first();
    if (await blogLink.isVisible()) {
      await blogLink.click();
      await expect(page).toHaveURL(/.*\/blog/);
    }
  });
});
