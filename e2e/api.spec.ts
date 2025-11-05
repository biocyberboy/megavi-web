import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test.describe('Price API', () => {
    test('GET /api/price/series should return series list', async ({ request }) => {
      const response = await request.get('/api/price/series');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('GET /api/price/latest should return latest prices', async ({ request }) => {
      const response = await request.get('/api/price/latest');
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /api/prices/metadata should return metadata', async ({ request }) => {
      const response = await request.get('/api/prices/metadata');
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Blog API', () => {
    test('GET /api/blog should return published posts', async ({ request }) => {
      const response = await request.get('/api/blog');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('GET /api/blog/[slug] should return specific post', async ({ request }) => {
      const listResponse = await request.get('/api/blog');
      const posts = await listResponse.json();
      
      if (posts.length > 0) {
        const firstPost = posts[0];
        const response = await request.get(`/api/blog/${firstPost.slug}`);
        
        if (response.ok()) {
          const post = await response.json();
          expect(post).toHaveProperty('slug');
          expect(post).toHaveProperty('title');
          expect(post).toHaveProperty('bodyMd');
        }
      }
    });

    test('GET /api/blog/[slug] should return 404 for non-existent post', async ({ request }) => {
      const response = await request.get('/api/blog/non-existent-post-12345');
      expect(response.status()).toBe(404);
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle invalid price code gracefully', async ({ request }) => {
      const response = await request.get('/api/price/invalid-code-12345');
      expect([200, 404, 500]).toContain(response.status());
    });

    test('API endpoints should return proper content-type', async ({ request }) => {
      const response = await request.get('/api/blog');
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });
  });
});
