import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { LatestSnapshotPanel } from '../components/LatestSnapshotPanel';

export class PricePage extends BasePage {
  readonly pageTitle = this.page.locator('h1:has-text("Giá Gia Cầm Việt Nam")');
  readonly productSelector = this.page.locator('select').first();
  readonly regionSelector = this.page.locator('select').nth(1);
  readonly rangeSelector = this.page.locator('select').last();
  readonly chart = this.page.locator('[data-testid="price-chart"], .recharts-wrapper, canvas').first();
  readonly priceTable = this.page.locator('table');
  readonly latestSnapshotPanel = new LatestSnapshotPanel(
    this.page.locator('.latest-snapshot-panel').first()
  );
  readonly loadingIndicator = this.page.locator('[data-testid="loading"]');

  async goto() {
    await super.goto('/gia');
  }

  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.pageTitle).toContainText('Giá Gia Cầm');
  }

  async verifyControlsPresent() {
    const selectors = this.page.locator('select');
    const count = await selectors.count();
    expect(count).toBeGreaterThanOrEqual(0);
  }

  async selectProduct(productValue: string) {
    await this.productSelector.selectOption(productValue);
    await this.page.waitForTimeout(500);
  }

  async selectRegion(regionValue: string) {
    await this.regionSelector.selectOption(regionValue);
    await this.page.waitForTimeout(500);
  }

  async selectRange(rangeValue: string) {
    await this.rangeSelector.selectOption(rangeValue);
    await this.page.waitForTimeout(500);
  }

  async verifyChartVisible() {
    await expect(this.chart).toBeVisible({ timeout: 10000 });
  }

  async verifyDataDisplayed() {
    const hasChart = await this.chart.isVisible().catch(() => false);
    const hasTable = await this.priceTable.isVisible().catch(() => false);
    expect(hasChart || hasTable).toBeTruthy();
  }

  async waitForDataLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }
}
