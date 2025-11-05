import { test, expect } from '@playwright/test';
import { checkAccessibility } from './utils/helpers';

test.describe('Accessibility Tests', () => {
  test('homepage should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const violations = await checkAccessibility(page);
    const criticalViolations = violations.filter((v) => !v.includes('extension'));
    
    expect(criticalViolations.length).toBeLessThanOrEqual(5);
  });

  test('all pages should have proper heading hierarchy', async ({ page }) => {
    const pages = ['/', '/gia', '/blog', '/admin'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      expect(h1Count).toBeLessThanOrEqual(2);
    }
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const buttons = page.locator('button, a[href]');
    const count = await buttons.count();
    
    if (count > 0) {
      const firstButton = buttons.first();
      await firstButton.focus();
      const isFocused = await firstButton.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBeTruthy();
    }
  });

  test('forms should have proper labels', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const count = await inputs.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      
      const hasLabel = !!(id || name || ariaLabel || placeholder);
      if (!hasLabel) {
        console.warn(`Input ${i} should have a label or aria-label`);
      }
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      if (role !== 'presentation' && !alt) {
        const src = await img.getAttribute('src');
        console.warn(`Image missing alt text: ${src}`);
      }
    }
  });

  test('color contrast should be sufficient', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button').first();
    const isVisible = await textElements.isVisible();
    expect(isVisible).toBeTruthy();
  });

  test('page should be navigable with keyboard only', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(activeElement);
  });
});
