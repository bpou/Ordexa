import { test, expect } from '@playwright/test';

// Extend window interface for mock Pusher events
declare global {
  interface Window {
    mockPusherEvent?: (eventType: string, data: any) => void;
  }
}

test.describe('Customer Portal Real-time Updates', () => {
  test('should update order status UI without page refresh', async ({ page, context }) => {
    // Navigate to an order page (assuming order ID 1 exists)
    await page.goto('/orders/1');

    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Order #');

    // Get initial status for track A
    const initialStatus = page.locator('.font-semibold').filter({ hasText: 'Status:' }).locator('..').locator('span').first();
    const initialStatusText = await initialStatus.textContent();

    // Open a second browser context to simulate admin changing status
    const adminPage = await context.newPage();
    await adminPage.goto('/orders/1');

    // Wait for admin page to load
    await expect(adminPage.locator('h1')).toContainText('Order #');

    // Mock Pusher event for status change
    await page.evaluate(() => {
      // Mock Pusher client to simulate real-time event
      (window as any).mockPusherEvent = (eventType: string, data: any) => {
        // Simulate the real-time update by directly calling the component's update logic
        const event = new CustomEvent('pusher:' + eventType, { detail: data });
        window.dispatchEvent(event);
      };
    });

    // Simulate status change from admin page
    const statusButton = adminPage.locator('button').filter({ hasText: 'Pågående' }).first();
    await statusButton.click();

    // Wait for status update (in real scenario, this would be triggered by Pusher)
    await page.waitForTimeout(1000); // Allow time for real-time update

    // Mock the Pusher event on the first page
    await page.evaluate(() => {
      // Simulate receiving Pusher event for status change
      (window as any).mockPusherEvent('order-1:status:updated', {
        track: 'A',
        status: 'PAGAENDE',
        timeSpentMinutes: 120
      });
    });

    // Verify UI updated without page refresh
    const updatedStatus = page.locator('.font-semibold').filter({ hasText: 'Status:' }).locator('..').locator('span').first();
    await expect(updatedStatus).toContainText('Pågående');

    // Verify time spent also updated
    const timeSpent = page.locator('.text-sm.font-semibold.text-brand-900').first();
    await expect(timeSpent).toContainText('2h 0m');

    // Verify status button is highlighted as active
    const activeButton = page.locator('button').filter({ hasText: 'Pågående' });
    await expect(activeButton).toHaveClass(/ring-2 ring-black\/10 scale-105/);

    // Test another status change
    await page.evaluate(() => {
      (window as any).mockPusherEvent('order-1:status:updated', {
        track: 'A',
        status: 'LEVERANS',
        timeSpentMinutes: 180
      });
    });

    await expect(updatedStatus).toContainText('Leverans');
    await expect(timeSpent).toContainText('3h 0m');
  });

  test('should handle file upload real-time updates', async ({ page }) => {
    await page.goto('/orders/1');

    // Wait for page load
    await expect(page.locator('h1')).toContainText('Order #');

    // Get initial file count
    const initialFileCount = await page.locator('.border.rounded.p-3').count();

    // Mock file creation event
    await page.evaluate(() => {
      (window as any).mockPusherEvent('order-1:file:created', {
        id: 'file-123',
        filename: 'test-document.pdf',
        url: '/api/files/file-123',
        track: 'A',
        createdAt: Date.now()
      });
    });

    // Verify file appeared in UI
    await expect(page.locator('.border.rounded.p-3')).toHaveCount(initialFileCount + 1);
    const newFile = page.locator('.border.rounded.p-3').last();
    await expect(newFile).toContainText('test-document.pdf');
    await expect(newFile).toContainText('Spår: A');
  });

  test('should handle file deletion real-time updates', async ({ page }) => {
    await page.goto('/orders/1');

    // Wait for page load
    await expect(page.locator('h1')).toContainText('Order #');

    // Assume there's at least one file
    const initialFileCount = await page.locator('.border.rounded.p-3').count();
    expect(initialFileCount).toBeGreaterThan(0);

    // Get first file ID (in real test, you'd extract from DOM)
    const firstFile = page.locator('.border.rounded.p-3').first();
    const fileId = 'file-123'; // Mock ID

    // Mock file deletion event
    await page.evaluate((id) => {
      (window as any).mockPusherEvent('order-1:file:deleted', { id });
    }, fileId);

    // Verify file was removed from UI
    await expect(page.locator('.border.rounded.p-3')).toHaveCount(initialFileCount - 1);
  });
});