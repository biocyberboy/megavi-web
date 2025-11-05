import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class BlogPostPage extends BasePage {
  readonly postTitle = this.page.locator('h1').first();
  readonly postContent = this.page.locator('main');
  readonly publishDate = this.page.locator('time, span').first();
  readonly backToBlogLink = this.page.locator('a[href="/blog"]').first();

  async gotoPost(slug: string) {
    await super.goto(`/blog/${slug}`);
  }

  async verifyPostLoaded() {
    await expect(this.postTitle).toBeVisible();
    await expect(this.postContent).toBeVisible();
  }

  async verifyPostTitle(expectedTitle: string) {
    await expect(this.postTitle).toContainText(expectedTitle);
  }

  async verifyContentPresent() {
    const content = await this.postContent.textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
  }

  async navigateBackToBlog() {
    if (await this.backToBlogLink.isVisible()) {
      await this.backToBlogLink.click();
    } else {
      await this.page.goBack();
    }
  }
}
