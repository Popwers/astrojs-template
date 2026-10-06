import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';

import { test } from './fixtures';

/** The banner shows 4 s after the first paint (`CookieBanner.astro`); the runner has no fake clock. */
const BANNER_DELAY_MS = 4000;

/**
 * Computed opacity of the layer `selector` names (1 once shown, 0 when hidden), read `afterMs`
 * after the call in the current document.
 */
const opacity = (browser: Browser, selector: string, afterMs = 0) =>
	browser.evaluate(
		({ target, delay }) =>
			new Promise<string>((resolve, reject) =>
				setTimeout(() => {
					const layer = document.querySelector(target);
					if (layer) resolve(getComputedStyle(layer).opacity);
					else reject(new Error(`${target} is not in the page`));
				}, delay),
			),
		{ target: selector, delay: afterMs },
	);

/** The consent store reloads the page after saving; wait for the fresh document. */
const waitForReload = async (browser: Browser, save: () => Promise<void>) => {
	const loadedAt = await browser.evaluate(() => performance.timeOrigin);
	await save();
	await expect
		.poll(() => browser.evaluate(() => performance.timeOrigin), { message: 'page reloaded' })
		.toBeGreaterThan(loadedAt);
};

test('first visit shows the banner and accepting hides it for good', async ({ app, screen, browser }) => {
	await app.open('/');
	await expect.poll(() => opacity(browser, '#cookie-banner'), { timeout: BANNER_DELAY_MS * 2 }).toBe('1');

	await waitForReload(browser, () => screen.getByRole('button', 'Tout accepter').tap());

	expect(await opacity(browser, '#cookie-banner', BANNER_DELAY_MS + 1000)).toBe('0');
});

test('customising cookies stores analytics as refused', async ({ app, screen, browser }) => {
	await app.open('/');
	await expect.poll(() => opacity(browser, '#cookie-banner'), { timeout: BANNER_DELAY_MS * 2 }).toBe('1');
	await screen.getByRole('button', 'Personnaliser').tap();

	await expect.poll(() => opacity(browser, '#cookie-modal')).toBe('1');
	await screen.getByRole('checkbox', 'Activer', { disabled: false }).uncheck();
	await waitForReload(browser, () => screen.getByRole('button', 'Enregistrer les préférences').tap());

	expect(await opacity(browser, '#cookie-banner', BANNER_DELAY_MS + 1000)).toBe('0');
	const stored = await browser.evaluate(() => localStorage.getItem('cookie-consent'));
	expect(stored).toBe('{"hasConsented":true,"preferences":{"functional":true,"analytics":false}}');
});
