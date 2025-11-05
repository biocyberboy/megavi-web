import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  readonly pageTitle = this.page.locator('h1:has-text("MEGAVI Admin")');
  readonly blogSection = this.page.locator('details:has-text("Quản lý bài viết")');
  readonly seriesSection = this.page.locator('details:has-text("Quản lý series")');
  readonly statsCards = this.page.locator('article').filter({ hasText: 'Sức khoẻ dữ liệu' });
  readonly blogForm = this.page.locator('form').first();
  readonly postsList = this.page.locator('table tbody tr');

  async goto() {
    await super.goto('/admin');
  }

  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
  }

  async verifyStatsDisplayed() {
    await expect(this.statsCards).toBeVisible();
  }

  async verifyBlogSectionPresent() {
    await expect(this.blogSection).toBeVisible();
  }

  async verifySeriesSectionPresent() {
    await expect(this.seriesSection).toBeVisible();
  }

  async expandBlogSection() {
    const isOpen = await this.blogSection.getAttribute('open');
    if (!isOpen) {
      await this.blogSection.locator('summary').click();
    }
  }

  async getPostsCount() {
    await this.expandBlogSection();
    const rows = this.postsList;
    return rows.count();
  }
}
