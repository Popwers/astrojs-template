import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

const BANNER_DELAY_MS = 4000;

const banner = (page: Page) => page.locator('#cookie-banner');

/** The consent store reloads the page after saving; wait for the fresh document. */
const waitForReload = async (page: Page, save: () => Promise<void>) => {
	const reloaded = page.waitForEvent('load');
	await save();
	await reloaded;
};

test('first visit shows the banner and accepting hides it for good', async ({ page }) => {
	await page.clock.install();
	await page.goto('/');
	await page.clock.runFor(BANNER_DELAY_MS);
	await expect(banner(page)).toHaveCSS('opacity', '1');

	await waitForReload(page, () => page.getByRole('button', { name: 'Tout accepter' }).click());
	await page.clock.runFor(BANNER_DELAY_MS * 2);

	await expect(banner(page)).toHaveCSS('opacity', '0');
});

test('customising cookies stores analytics as refused', async ({ page }) => {
	await page.clock.install();
	await page.goto('/');
	await page.clock.runFor(BANNER_DELAY_MS);
	await page.getByRole('button', { name: 'Personnaliser' }).click();

	await expect(page.locator('#cookie-modal')).toHaveCSS('opacity', '1');
	await page.locator('#analytics-cookies').uncheck();
	await waitForReload(page, () =>
		page.getByRole('button', { name: 'Enregistrer les préférences' }).click(),
	);
	await page.clock.runFor(BANNER_DELAY_MS * 2);

	await expect(banner(page)).toHaveCSS('opacity', '0');
	const stored = await page.evaluate(() => localStorage.getItem('cookie-consent'));
	expect(stored).toBe('{"hasConsented":true,"preferences":{"functional":true,"analytics":false}}');
});
