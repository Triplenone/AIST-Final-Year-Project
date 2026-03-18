import { expect, test } from '@playwright/test';
import {
  clearActiveEvents,
  getFirstElderlyDevice,
  getLatestEvent,
  resolveEvent,
  sendFallPayload
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'en');
  });
});

test.describe('Frontend Interaction Test', () => {
  test('TC-FE-01 Real-time Alert Modal appears within 1s', async ({ page, request }, testInfo) => {
    await clearActiveEvents(request);
    const device = await getFirstElderlyDevice(request);

    await page.goto('/');
    await page.waitForSelector('#overview');

    const start = Date.now();
    await sendFallPayload(request, device.device_id);

    const modal = page.locator('.emergency-overlay');
    await modal.waitFor({ state: 'visible', timeout: 3000 });
    await page.screenshot({
      path: testInfo.outputPath('tc-fe-01-alert-modal.png'),
      fullPage: true
    });
    const elapsed = Date.now() - start;

    const latest = await getLatestEvent(request, 'fall');
    if (latest) {
      await resolveEvent(request, latest.event_id, 'resolved');
    }

    expect(elapsed).toBeLessThanOrEqual(1000);
  });

  test('TC-FE-02 Response logic updates status', async ({ page, request }, testInfo) => {
    await clearActiveEvents(request);
    const device = await getFirstElderlyDevice(request);

    await page.goto('/');
    await page.waitForSelector('#overview');

    await sendFallPayload(request, device.device_id);
    const modal = page.locator('.emergency-overlay');
    await expect(modal).toBeVisible();

    const statusValue = modal
      .locator('.emergency-overlay__label', { hasText: 'Status' })
      .locator('..')
      .locator('.emergency-overlay__value');

    await modal.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(statusValue).toHaveText('Confirmed');
    await page.screenshot({
      path: testInfo.outputPath('tc-fe-02-confirmed-status.png'),
      fullPage: true
    });

    await modal.getByRole('button', { name: 'Resolve' }).click();
    await expect(modal).toBeHidden();
  });

  test('TC-FE-03 Dashboard visualization updates multiple nodes', async ({ page, request }) => {
    await clearActiveEvents(request);
    const device = await getFirstElderlyDevice(request);

    await page.goto('/');
    await page.waitForSelector('#overview');

    const residentItems = page.locator('.hero-residents__item');
    await expect.poll(async () => residentItems.count()).toBeGreaterThan(1);

    await sendFallPayload(request, device.device_id);

    await expect.poll(async () => page.locator('.status-high').count()).toBeGreaterThan(0);
    await expect(page.locator('.alert--backend').first()).toBeVisible();
    await expect(page.locator('.emergency-overlay')).toBeVisible();
  });
});
