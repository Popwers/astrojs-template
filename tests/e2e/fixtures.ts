import { test as base } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';
import type { App, Screen } from 'e2e';

/** A `credentials` entry in `e2e.config.ts`: a Strapi user the stub knows. */
type Account = 'editor' | 'reader';

/**
 * Astro prefetches every link in view, and the template menu links to placeholder routes
 * (`/menu1`, `/menu2/...`) that have no page. Those prefetch 404s belong to the placeholder menu,
 * not to the page under test, so they are always allowed.
 */
const PLACEHOLDER_MENU_PREFETCH = /^(?:status 404|resource failed): \S+\/menu\d/;

/**
 * `test` with a guard that fails the test on any `console.error`, uncaught page error, failed
 * same-origin load or CSP violation that `page-errors.js` recorded in the page it ends on. A test
 * expecting one pushes a pattern onto `allowedPageErrors`.
 */
const test = base
	.extend<{ allowedPageErrors: RegExp[] }>({
		allowedPageErrors: async (_fixtures, use) => {
			await use([PLACEHOLDER_MENU_PREFETCH]);
		},
	})
	.extend<{ pageErrorGuard: undefined }>({
		pageErrorGuard: async ({ browser, allowedPageErrors }, use) => {
			await use(undefined);
			await expectNoPageErrors(browser, allowedPageErrors);
		},
	});

/** Fails when the current page recorded an error that no `allowed` pattern matches. */
const expectNoPageErrors = async (browser: Browser, allowed: RegExp[]) => {
	const errors = await browser.evaluate<string[]>(() => {
		try {
			return JSON.parse(sessionStorage.getItem('__e2ePageErrors') ?? '[]');
		} catch {
			return [];
		}
	});
	const unexpected = errors.filter((error) => !allowed.some((pattern) => pattern.test(error)));
	expect(unexpected, 'page errors (console, uncaught, failed loads, CSP)').toEqual([]);
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
