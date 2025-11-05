import type { Page } from '@playwright/test';

export class BasePage {
  constructor(public readonly page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
  }

  async getTitle() {
    return this.page.title();
  }

  async waitForLoadState() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}
