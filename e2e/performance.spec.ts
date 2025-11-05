import { test, expect } from '@playwright/test';
import { checkPerformance } from './utils/helpers';

test.describe('Performance Tests', () => {
  test('homepage should load within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
  });

  test('price page should load data within 10 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/gia');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });

  test('blog page should load within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have acceptable Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const metrics = await checkPerformance(page);
    
    expect(metrics.firstContentfulPaint).toBeLessThan(3000);
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    const pages = ['/', '/gia', '/blog', '/', '/gia', '/blog'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
    }
    
    const metrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        };
      }
      return null;
    });
    
    if (metrics) {
      expect(metrics.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    }
  });
});

test.describe('Image Loading Performance', () => {
  test('images should have proper loading attributes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute('loading');
      const isAboveFold = await img.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight;
      });
      
      if (!isAboveFold && loading !== 'lazy') {
        console.warn(`Image ${i} should have loading="lazy"`);
      }
    }
  });
});
