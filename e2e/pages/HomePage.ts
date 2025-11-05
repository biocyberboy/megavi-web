import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heroSection = this.page.locator('#hero');
  readonly heroTitle = this.page.locator('h1:has-text("MEGAVI Insight")');
  readonly heroCTA = this.page.locator('#hero a[href="/gia"]').first();
  readonly blogCTA = this.page.locator('#hero a[href="/blog"]').first();
  readonly latestPostsSection = this.page.locator('section').filter({ hasText: 'Đừng bỏ lỡ nhịp đập thị trường' });
  readonly postCards = this.page.locator('a[href^="/blog/"]');

  async goto() {
    await super.goto('/');
  }

  async verifyHeroSection() {
    await expect(this.heroSection).toBeVisible();
    await expect(this.heroTitle).toBeVisible();
    await expect(this.heroTitle).toContainText('MEGAVI Insight');
  }

  async verifyHeroCTAs() {
    await expect(this.heroCTA).toBeVisible();
    await expect(this.heroCTA).toContainText('Xem bảng giá hôm nay');
    await expect(this.blogCTA).toBeVisible();
  }

  async clickPriceCTA() {
    await this.heroCTA.click();
    await this.page.waitForURL('**/gia');
  }

  async clickBlogCTA() {
    await this.blogCTA.click();
    await this.page.waitForURL('**/blog');
  }

  async verifyLatestPosts() {
    await expect(this.latestPostsSection).toBeVisible();
  }

  async getPostCardCount() {
    return this.postCards.count();
  }

  async clickFirstPost() {
    const firstPost = this.postCards.first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();
  }
}
