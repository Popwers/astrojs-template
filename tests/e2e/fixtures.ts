import { test as base } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';
import type { App, Screen } from 'e2e';

/** A `credentials` entry in `e2e.config.ts`: a Strapi user the stub knows. */
type Account = 'editor' | 'reader';

/**
 * `test` with a guard that fails the test on any `console.error` or uncaught page error that
 * `page-errors.js` recorded in the page it ends on. Browser-generated "Failed to load resource"
 * lines never reach it, so the prefetch 404s of the placeholder menu links (`/menu1`, ...) do not count.
 */
const test = base.extend<{ pageErrorGuard: undefined }>({
	pageErrorGuard: async ({ browser }, use) => {
		await use(undefined);
		await expectNoPageErrors(browser);
	},
});

/** Fails when the current page recorded a `console.error` or an uncaught error. */
const expectNoPageErrors = async (browser: Browser) => {
	const errors = await browser.evaluate<string[]>(() => {
		try {
			return JSON.parse(sessionStorage.getItem('__e2ePageErrors') ?? '[]');
		} catch {
			return [];
		}
	});
	expect(errors, 'console errors and uncaught page errors').toEqual([]);
};

/** Signs `account` in through the login form and waits for the dashboard. */
const logIn = async (app: App, screen: Screen, browser: Browser, account: Account) => {
	const user = credentials.user(account);
	await app.open('/login');
	await screen.getByLabel('Adresse mail').fill(user.username);
	await screen.getByLabel('Mot de passe').fill(user.password);
	await screen.getByRole('button', 'Se connecter').tap();
	await expect(browser).toHaveURL('/dashboard');
};

export { logIn, test };
