import type { Page } from '@playwright/test';

export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse((response) => {
    const url = response.url();
    const matches = typeof urlPattern === 'string' 
      ? url.includes(urlPattern) 
      : urlPattern.test(url);
    return matches && response.status() === 200;
  });
}

export async function mockApiResponse(page: Page, url: string, response: any) {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

export function generateTestData(type: 'blog' | 'price' | 'series') {
  switch (type) {
    case 'blog':
      return {
        slug: `test-post-${Date.now()}`,
        title: `Test Blog Post ${Date.now()}`,
        summary: 'This is a test blog post summary',
        body_md: '# Test Content\n\nThis is test content.',
      };
    case 'series':
      return {
        code: `test-series-${Date.now()}`,
        name: `Test Series ${Date.now()}`,
        unit: 'đ/kg',
      };
    case 'price':
      return {
        ts: new Date().toISOString(),
        value: Math.floor(Math.random() * 100000),
        source: 'Test Source',
      };
  }
}

export async function checkAccessibility(page: Page) {
  const violations = await page.evaluate(() => {
    const issues: string[] = [];
    
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.alt) {
        issues.push(`Image missing alt text: ${img.src}`);
      }
    });
    
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn) => {
      if (!btn.textContent?.trim() && !btn.getAttribute('aria-label')) {
        issues.push('Button missing accessible name');
      }
    });
    
    return issues;
  });
  
  return violations;
}

export async function checkPerformance(page: Page) {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
    };
  });
  
  return metrics;
}
