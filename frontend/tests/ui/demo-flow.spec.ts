import { expect, test } from '@playwright/test';
import {
  clearActiveEvents,
  ensureOutdoorLocation,
  getFirstElderlyDevice,
  sendMultiEventPayload
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'en');
  });
});

test('Demo flow recording', async ({ page, request }) => {
  const device = await getFirstElderlyDevice(request);
  const outdoor = await ensureOutdoorLocation(request);
  await clearActiveEvents(request);

  await page.goto('/');
  await page.waitForSelector('#overview');


  await page.locator('#location').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Outdoor' }).click({ force: true });

  await sendMultiEventPayload(request, device.device_id, outdoor.name ?? 'Outdoor Garden');

  await page.locator('#operations').scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: 'Live alerts' })).toBeVisible();

  const modal = page.locator('.emergency-overlay');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Acknowledge' }).click();
  await clearActiveEvents(request);
  await expect(modal).toBeHidden();

  await page.locator('#admin').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'User status' }).click();

  const userStatusCard = page.locator('.admin-card', { hasText: 'User Status' });
  const userStatusForm = userStatusCard.locator('.admin-form');
  await userStatusForm.getByLabel(/User/i).selectOption({ index: 1 });
  await userStatusForm.getByLabel(/Device/i).selectOption({ index: 1 });
  await userStatusForm.getByRole('spinbutton', { name: 'HR' }).fill('78');
  await userStatusForm.getByRole('spinbutton', { name: 'SpO2' }).fill('97');
  await userStatusForm.getByRole('spinbutton', { name: /Temp/i }).fill('36.7');
  const datetimeValue = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await userStatusForm.getByLabel(/timestamp/i).fill(datetimeValue);
  await userStatusForm.getByRole('button', { name: '?°å? (Create)' }).click();

  await page.getByRole('button', { name: 'KPI' }).click();
  const kpiCard = page.locator('.admin-card', { hasText: 'KPI ç®¡ç?' });
  const kpiForm = kpiCard.locator('.admin-form');
  await kpiForm.getByLabel(/Name/i).fill('Demo KPI');
  await kpiForm.getByLabel(/Cycle/i).selectOption('daily');
  await kpiForm.getByRole('spinbutton', { name: /Value/i }).fill('5.5');
  await kpiForm.getByRole('spinbutton', { name: /Target/i }).fill('10');
  await kpiForm.getByLabel(/record_timestamp/i).fill(datetimeValue);
  await kpiForm.getByRole('button', { name: '?°å? (Create)' }).click();
});

