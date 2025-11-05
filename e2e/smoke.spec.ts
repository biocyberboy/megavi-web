import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Path', () => {
  test('all main pages should be accessible', async ({ page }) => {
    const pages = [
      { path: '/', title: /MEGAVI/i },
      { path: '/gia', title: /Bảng giá|Giá/i },
      { path: '/blog', title: /Bản tin|Blog/i },
      { path: '/admin', title: /Admin/i },
    ];

    for (const { path, title } of pages) {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
      await expect(page).toHaveTitle(title);
    }
  });

  test('no critical JavaScript errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.goto('/gia');
    await page.goto('/blog');

    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('extension') &&
        !error.includes('chrome-extension')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('API endpoints are responding', async ({ request }) => {
    const endpoints = ['/api/blog', '/api/price/series', '/api/price/latest'];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('static assets are loading', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (!url.includes('analytics') && !url.includes('gtm')) {
        failedRequests.push(url);
      }
    });

    await page.reload();
    expect(failedRequests.length).toBeLessThanOrEqual(2);
  });

  test('database connection is working', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');

    const hasError = await page
      .locator('text=/database error|connection failed/i')
      .isVisible()
      .catch(() => false);

    expect(hasError).toBeFalsy();
  });
});

test.describe('Smoke Tests - Quick Health Check', () => {
  test('homepage loads in under 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForSelector('h1');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('all pages return valid HTML', async ({ page }) => {
    const pages = ['/', '/gia', '/blog', '/admin'];

    for (const path of pages) {
      await page.goto(path);
      const html = await page.content();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    }
  });

  test('no 404 errors for main navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mainLinks = page.locator('nav a, header a');
    const count = await mainLinks.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const link = mainLinks.nth(i);
      const href = await link.getAttribute('href');

      if (href && href.startsWith('/') && !href.includes('#')) {
        const response = await page.goto(href);
        expect(response?.status()).not.toBe(404);
        await page.goBack();
      }
    }
  });
});
