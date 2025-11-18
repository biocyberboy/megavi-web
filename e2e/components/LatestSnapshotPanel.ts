import { expect, type Locator } from '@playwright/test';

/**
 * Component Object cho bảng "Bảng giá mới nhất" trên trang giá.
 * Được dùng bên trong PricePage thay vì truy cập DOM trực tiếp trong test.
 */
export class LatestSnapshotPanel {
  private readonly dataRows: Locator;

  constructor(private readonly root: Locator) {
    this.dataRows = this.root.locator('tbody tr:not(.region-header)');
  }

  /**
   * Kiểm tra panel có hiển thị hay không.
   */
  async isVisible(): Promise<boolean> {
    return this.root.isVisible().catch(() => false);
  }

  /**
   * Đợi panel xuất hiện trên màn hình.
   */
  async waitForVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  /**
   * Trả về số dòng dữ liệu (bỏ qua dòng header theo vùng).
   */
  async getEntryCount(): Promise<number> {
    return this.dataRows.count();
  }

  /**
   * Trả về true nếu có ít nhất một dòng dữ liệu.
   */
  async hasEntries(): Promise<boolean> {
    const count = await this.getEntryCount();
    return count > 0;
  }

  /**
   * Khẳng định rằng panel có ít nhất một dòng dữ liệu.
   */
  async expectHasEntries(): Promise<void> {
    const count = await this.getEntryCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Lấy text giá ở dòng đầu tiên (chia sẻ ví dụ cách đọc data từ component).
   */
  async getFirstValueText(): Promise<string | null> {
    const firstValueCell = this.root
      .locator('tbody tr:not(.region-header) td:nth-child(2)')
      .first();

    const isVisible = await firstValueCell.isVisible().catch(() => false);
    if (!isVisible) {
      return null;
    }

    const text = await firstValueCell.textContent();
    return text?.trim() || null;
  }
}

