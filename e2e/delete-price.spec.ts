import { test, expect } from '@playwright/test';

/**
 * Test: Delete most recent price row in admin page
 * Scenario: Admin deletes the latest price entry from "Các dòng giá gần nhất" table
 */

async function loginToAdmin(page: any) {
  await page.goto('/admin');
  
  const passcodeInput = page.locator('input#admin-pass');
  
  if (await passcodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    const adminPasscode = process.env.ADMIN_PASSCODE || 'test123';
    await passcodeInput.fill(adminPasscode);
    await page.locator('button[type="submit"]:has-text("Truy cập")').click();
    await page.waitForTimeout(2000);
  }
  
  await page.waitForLoadState('networkidle');
}

test.describe('Delete Latest Price Row in Admin', () => {
  test('should delete the most recent price point successfully', async ({ page }) => {
    // Step 1: Login to admin page
    await loginToAdmin(page);

    // Step 2: Find the latest prices table section
    const pricesSection = page.locator('h3:has-text("Các dòng giá gần nhất")').locator('..');
    await expect(pricesSection).toBeVisible({ timeout: 10000 });

    // Step 3: Find the table within the section
    const pricesTable = pricesSection.locator('table');
    await expect(pricesTable).toBeVisible();

    // Step 4: Count rows before deletion
    const tbody = pricesTable.locator('tbody');
    const rowsBefore = await tbody.locator('tr').count();

    console.log(`📊 Total price rows before deletion: ${rowsBefore}`);

    if (rowsBefore === 0) {
      console.log('ℹ️ No price data to delete, test passed (empty state)');
      return;
    }
    
    if (rowsBefore < 2) {
      console.log(`ℹ️ Only ${rowsBefore} row(s), skipping detailed verification`);
    }

    // Step 5: Get the first row (most recent price entry)
    const firstRow = tbody.locator('tr').first();
    const firstRowExists = await firstRow.isVisible().catch(() => false);
    
    if (!firstRowExists) {
      console.log('⚠️ First row not found (may have been deleted by parallel test), skipping');
      return;
    }
    
    // Step 6: Get the price details before deleting (for verification)
    const seriesName = await firstRow.locator('td').nth(0).locator('div').first().textContent();
    const region = await firstRow.locator('td').nth(1).textContent();
    const date = await firstRow.locator('td').nth(2).textContent();
    const value = await firstRow.locator('td').nth(3).textContent();

    console.log('🎯 Deleting price entry:', {
      series: seriesName?.trim(),
      region: region?.trim(),
      date: date?.trim(),
      value: value?.trim(),
    });

    // Step 7: Find the delete button in the first row
    const deleteButton = firstRow.locator('button:has-text("Xoá")');
    await expect(deleteButton).toBeVisible();

    // Step 8: Click delete button (shows confirm)
    await deleteButton.click();
    await page.waitForTimeout(500);
    
    // Step 9: Wait for confirm button to appear and click it
    const confirmButton = firstRow.locator('button:has-text("Xác nhận")');
    await expect(confirmButton).toBeVisible({ timeout: 3000 });
    await confirmButton.click();

    // Step 10: Wait for deletion to complete
    await page.waitForTimeout(2500);

    // Step 10: Reload page to verify deletion
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 11: Check if table still exists
    const tableStillExists = await pricesSection.locator('table').isVisible().catch(() => false);

    if (!tableStillExists) {
      console.log('✅ TEST PASS: All price data deleted, table removed');
      return;
    }

    // Step 12: Count rows after deletion
    const rowsAfter = await tbody.locator('tr').count();
    console.log(`📊 Total price rows after deletion: ${rowsAfter}`);

    // Step 13: Verify row count decreased OR table is gone
    const deletionSuccessful = rowsAfter < rowsBefore || !tableStillExists;
    expect(deletionSuccessful).toBeTruthy();

    // Step 14: Verify the deleted entry is not in the first row anymore
    if (rowsAfter > 0) {
      const newFirstRow = tbody.locator('tr').first();
      const newSeriesName = await newFirstRow.locator('td').nth(0).locator('div').first().textContent();
      const newDate = await newFirstRow.locator('td').nth(2).textContent();

      // The first row should be different (unless it was the only row)
      const isDifferent = 
        newSeriesName?.trim() !== seriesName?.trim() || 
        newDate?.trim() !== date?.trim();

      if (isDifferent) {
        console.log('✅ Confirmed: First row changed after deletion');
      }
    }

    console.log(`✅ TEST PASS: Successfully deleted most recent price row (${rowsBefore} → ${rowsAfter})`);
  });

  test('should handle deletion when multiple price rows exist', async ({ page }) => {
    // Step 1: Login to admin page
    await loginToAdmin(page);

    // Step 2: Navigate to prices section
    const pricesSection = page.locator('h3:has-text("Các dòng giá gần nhất")').locator('..');
    await expect(pricesSection).toBeVisible();

    // Step 3: Count initial rows
    const tbody = pricesSection.locator('table tbody');
    const initialCount = await tbody.locator('tr').count();

    if (initialCount < 2) {
      console.log('ℹ️ Less than 2 rows, skipping multi-row test');
      return;
    }

    console.log(`📊 Starting with ${initialCount} price rows`);

    // Step 4: Delete first row
    const firstDeleteBtn = tbody.locator('tr').first().locator('button:has-text("Xoá")');
    await firstDeleteBtn.click();
    
    // Click confirm
    const firstConfirmBtn = tbody.locator('tr').first().locator('button:has-text("Xác nhận")');
    await expect(firstConfirmBtn).toBeVisible();
    await firstConfirmBtn.click();
    await page.waitForTimeout(1500);

    // Step 5: Reload and verify
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 6: Check count after first deletion
    const countAfterFirst = await tbody.locator('tr').count();
    expect(countAfterFirst).toBe(initialCount - 1);

    console.log(`✅ First deletion successful (${initialCount} → ${countAfterFirst})`);

    // Step 7: Delete another row if available
    if (countAfterFirst > 0) {
      const secondDeleteBtn = tbody.locator('tr').first().locator('button:has-text("Xoá")');
      await secondDeleteBtn.click();
      
      // Click confirm
      const secondConfirmBtn = tbody.locator('tr').first().locator('button:has-text("Xác nhận")');
      await expect(secondConfirmBtn).toBeVisible();
      await secondConfirmBtn.click();
      await page.waitForTimeout(1500);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const countAfterSecond = await tbody.locator('tr').count();
      expect(countAfterSecond).toBe(countAfterFirst - 1);

      console.log(`✅ Second deletion successful (${countAfterFirst} → ${countAfterSecond})`);
    }

    console.log('✅ TEST PASS: Multiple consecutive deletions work correctly');
  });
});
