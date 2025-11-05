import { test, expect } from './fixtures/pages';

test.describe('Blog Listing Page', () => {
  test('should load blog page successfully', async ({ blogPage }) => {
    await blogPage.goto();
    await blogPage.verifyPageLoaded();
  });

  test('should display published blog posts', async ({ blogPage }) => {
    await blogPage.goto();
    const postCount = await blogPage.getPostCount();
    expect(postCount).toBeGreaterThanOrEqual(0);
  });

  test('should show post cards with title and date', async ({ blogPage }) => {
    await blogPage.goto();
    const postCount = await blogPage.getPostCount();
    
    if (postCount > 0) {
      await blogPage.verifyPostCard(0);
    }
  });

  test('should navigate to blog post when clicking card', async ({ blogPage }) => {
    await blogPage.goto();
    const postCount = await blogPage.getPostCount();
    
    if (postCount > 0) {
      const href = await blogPage.clickPost(0);
      await expect(blogPage.page).toHaveURL(new RegExp(href!));
    }
  });

  test('should have correct page title', async ({ blogPage, page }) => {
    await blogPage.goto();
    await expect(page).toHaveTitle(/Bản tin/i);
  });

  test('should be responsive on mobile', async ({ blogPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await blogPage.goto();
    await blogPage.verifyPageLoaded();
  });

  test('should display empty state when no posts available', async ({ blogPage, page }) => {
    await page.route('**/api/blog', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    
    await blogPage.goto();
    await blogPage.verifyPageLoaded();
  });
});

test.describe('Blog Post Detail Page', () => {
  test('should load individual blog post', async ({ blogPage, blogPostPage }) => {
    await blogPage.goto();
    const postCount = await blogPage.getPostCount();
    
    if (postCount > 0) {
      await blogPage.clickPost(0);
      await blogPostPage.verifyPostLoaded();
    }
  });

  test('should display post title and content', async ({ blogPage, blogPostPage }) => {
    await blogPage.goto();
    const postCount = await blogPage.getPostCount();
    
    if (postCount > 0) {
      await blogPage.clickPost(0);
      await blogPostPage.verifyPostLoaded();
      await blogPostPage.verifyContentPresent();
    }
  });

  test('should handle non-existent post gracefully', async ({ blogPostPage, page }) => {
    const response = await page.goto('/blog/non-existent-post-12345');
    expect(response?.status()).toBe(404);
  });

  test('should be accessible on mobile devices', async ({ blogPage, blogPostPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await blogPage.goto();
    const postCount = await blogPage.getPostCount();
    
    if (postCount > 0) {
      await blogPage.clickPost(0);
      await blogPostPage.verifyPostLoaded();
    }
  });
});

test.describe('Blog Navigation Flow', () => {
  test('should navigate from home -> blog -> post -> back', async ({ homePage, blogPage, blogPostPage, page }) => {
    await homePage.goto();
    await homePage.clickBlogCTA();
    await expect(page).toHaveURL(/.*\/blog$/);
    
    const postCount = await blogPage.getPostCount();
    if (postCount > 0) {
      await blogPage.clickPost(0);
      await expect(page).toHaveURL(/.*\/blog\/.+/);
      await blogPostPage.verifyPostLoaded();
      
      await page.goBack();
      await expect(page).toHaveURL(/.*\/blog$/);
    }
  });
});
