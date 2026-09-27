import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { StubAccount } from './accounts';

interface Fixtures {
	consoleErrors: () => string[];
}

/**
 * Playwright `test` that records the page's browser console errors. Astro
 * prefetches every link in view, and the template menu links to placeholder
 * routes (`/menu1`, `/menu2/...`) that have no page. Those prefetch 404s are a
 * property of the placeholder menu, not of the page under test, so they are left out.
 */
const test = base.extend<Fixtures>({
	consoleErrors: async ({ page }, use) => {
		const errors: { text: string; url: string }[] = [];
		const missedPrefetches = new Set<string>();
		page.on('console', (message) => {
			if (message.type() === 'error')
				errors.push({ text: message.text(), url: message.location().url });
		});
		page.on('pageerror', (error) => errors.push({ text: error.message, url: '' }));
		page.on('response', (response) => {
			const purpose = response.request().headers()['sec-purpose'] ?? '';
			if (response.status() >= 400 && purpose.includes('prefetch'))
				missedPrefetches.add(response.url());
		});
		await use(() =>
			errors.filter(({ url }) => !missedPrefetches.has(url)).map(({ text, url }) => `${text} (${url})`),
		);
	},
});

/** Sign in through the login form and wait for the dashboard. */
const logIn = async (page: Page, account: StubAccount) => {
	await page.goto('/login');
	await page.getByLabel('Adresse mail').fill(account.user.email);
	await page.getByLabel('Mot de passe', { exact: true }).fill(account.password);
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page).toHaveURL('/dashboard');
};

export { expect, logIn, test };
