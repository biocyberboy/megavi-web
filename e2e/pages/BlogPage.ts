import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class BlogPage extends BasePage {
  readonly pageTitle = this.page.locator('h1:has-text("Nhịp đập thị trường gia cầm")');
  readonly postCards = this.page.locator('a[href^="/blog/"]');
  readonly firstPost = this.postCards.first();

  async goto() {
    await super.goto('/blog');
  }

  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
  }

  async verifyPostsDisplayed() {
    const count = await this.postCards.count();
    expect(count).toBeGreaterThan(0);
  }

  async getPostCount() {
    return this.postCards.count();
  }

  async clickPost(index: number = 0) {
    const post = this.postCards.nth(index);
    await expect(post).toBeVisible();
    const href = await post.getAttribute('href');
    await post.click();
    return href;
  }

  async verifyPostCard(index: number) {
    const card = this.postCards.nth(index);
    await expect(card).toBeVisible();
    
    const title = card.locator('h2');
    await expect(title).toBeVisible();
    
    const date = card.locator('span').first();
    await expect(date).toBeVisible();
  }
}
