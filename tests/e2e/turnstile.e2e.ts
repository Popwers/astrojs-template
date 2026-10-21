import { expect } from 'e2e';
import type { Screen } from 'e2e';

import { READER } from './accounts';
import { test } from './fixtures';
import { BLOCK_URL, CHALLENGE_URL, REJECT_URL } from './servers';

const PASSWORD = 'Nouveau-2026!';
const CONFIRMATION_SENT = 'A confirmation email has been sent to your email address.';
/** The server's refusal, and the widget's own notice when the challenge fails. */
const REJECTED = 'La vérification anti-robot a échoué. Veuillez réessayer.';
const PENDING = 'Vérification anti-robot en cours…';
const TICK_TO_SEND = 'Cochez la case ci-dessus pour envoyer le formulaire.';
const SLOW = 'La vérification anti-robot prend plus de temps que prévu. Réessayez dans un instant.';
const UNAVAILABLE =
	'La vérification anti-robot n’a pas pu se charger. Désactivez votre bloqueur de contenu ou rechargez la page.';
const TURNSTILE_SCRIPT = /^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/;
/** Where the checkbox of the interactive widget sits, from the widget's top-left corner. */
const CHECKBOX_OFFSET = { x: 16, y: 24 };
/** The register page links to `/terms`, a placeholder route the template has no page for. */
const PLACEHOLDER_TERMS_PREFETCH = /^(?:status 404|resource failed): \S+\/terms /;

test('registering reaches the confirmation page and a new mail can be requested', async ({
	app,
	screen,
	browser,
	allowedPageErrors,
}) => {
	allowedPageErrors.push(PLACEHOLDER_TERMS_PREFETCH);
	await app.open('/register');
	await screen.getByLabel('Adresse mail').fill('nouveau@example.com');
	await screen.getByLabel('Mot de passe').fill(PASSWORD);
	await screen.getByLabel('Confirmer votre mot de passe').fill(PASSWORD);
	await screen.getByRole('button', 'S’inscrire').tap();

	await expect(browser).toHaveURL('/register/mail-confirmation');
	await screen.getByRole('button', 'Renvoyer un mail').tap();
	await expect(screen.getByText(CONFIRMATION_SENT)).toBeVisible();
});

test('lost password reaches the waiting page and a new mail can be requested', async ({
	app,
	screen,
	browser,
}) => {
	await app.open('/lost-password');
	await screen.getByLabel('Adresse mail').fill('jean.dupont@example.com');
	await screen.getByRole('button', 'Réinitialiser mon mot de passe').tap();

	await expect(browser).toHaveURL('/lost-password/wait-mail');
	await screen.getByRole('button', 'Renvoyer un mail').tap();
	await expect(screen.getByText(CONFIRMATION_SENT)).toBeVisible();
});

test('a reset link signs the visitor in on the dashboard', async ({ app, screen, browser }) => {
	await app.open('/lost-password/reset?code=stub-code');
	await fillResetPassword(screen);
	await screen.getByRole('button', 'Changer mon mot de passe').tap();

	await expect(browser).toHaveURL('/dashboard');
});

/**
 * The reset page renders two sets of password fields and they share ids, so labels reach only the
 * first set. Every field is required, so each one gets the same value.
 */
async function fillResetPassword(screen: Screen) {
	for (const field of await screen.getByRole('textbox').all()) {
		await field.fill(PASSWORD);
	}
}

interface RejectCase {
	form: string;
	path: string;
	cookie?: { name: string; value: string };
	fill: (screen: Screen) => Promise<void>;
	submit: string;
}

async function fillLogin(screen: Screen) {
	await screen.getByLabel('Adresse mail').fill(READER.user.email);
	await screen.getByLabel('Mot de passe').fill(READER.password);
}

const rejectCases: RejectCase[] = [
	{
		form: 'login',
		path: '/login',
		fill: fillLogin,
		submit: 'Se connecter',
	},
	{
		form: 'register',
		path: '/register',
		fill: async (screen) => {
			await screen.getByLabel('Adresse mail').fill('nouveau@example.com');
			await screen.getByLabel('Mot de passe').fill(PASSWORD);
			await screen.getByLabel('Confirmer votre mot de passe').fill(PASSWORD);
		},
		submit: 'S’inscrire',
	},
	{
		form: 'register mail confirmation',
		path: '/register/mail-confirmation',
		cookie: { name: 'mail-confirmation', value: 'nouveau@example.com' },
		fill: async () => {},
		submit: 'Renvoyer un mail',
	},
	{
		form: 'lost password',
		path: '/lost-password',
		fill: async (screen) => {
			await screen.getByLabel('Adresse mail').fill('jean.dupont@example.com');
		},
		submit: 'Réinitialiser mon mot de passe',
	},
	{
		form: 'lost password mail',
		path: '/lost-password/wait-mail',
		cookie: { name: 'wait-mail-password', value: 'jean.dupont@example.com' },
		fill: async () => {},
		submit: 'Renvoyer un mail',
	},
	{
		form: 'reset password',
		path: '/lost-password/reset?code=stub-code',
		fill: fillResetPassword,
		submit: 'Changer mon mot de passe',
	},
];

for (const { form, path, cookie, fill, submit } of rejectCases) {
	test(`the ${form} form shows the rejection when Turnstile refuses the token`, async ({
		app,
		screen,
		browser,
		allowedPageErrors,
	}) => {
		allowedPageErrors.push(/^status 403: /, PLACEHOLDER_TERMS_PREFETCH);
		if (cookie) await browser.setCookies([{ ...cookie, url: REJECT_URL }]);
		await app.open(`${REJECT_URL}${path}`);
		await fill(screen);
		await screen.getByRole('button', submit).tap();

		await expect(screen.getByText(REJECTED)).toBeVisible();
		await expect(browser).toHaveURL(new RegExp(`${new URL(path, REJECT_URL).pathname}(\\?|$)`));
	});
}

test('the widget takes no room while Cloudflare passes the visitor in the background', async ({
	app,
	browser,
}) => {
	await app.open('/login');

	await expect
		.poll(() =>
			browser.evaluate(
				() => document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value ?? '',
			),
		)
		.not.toBe('');
	const widget = await browser.locator('[data-turnstile]').boundingBox();
	expect(widget?.height ?? 0, 'height of the invisible widget').toBe(0);
});

test('a forced challenge shows the checkbox and sends the held login once it is ticked', async ({
	app,
	screen,
	browser,
}) => {
	await app.open(`${CHALLENGE_URL}/login`);
	await fillLogin(screen);
	await screen.getByRole('button', 'Se connecter').tap();

	await expect(screen.getByText(TICK_TO_SEND)).toBeVisible({ timeout: 15_000 });
	await expect(browser).toHaveURL(new RegExp(`^${CHALLENGE_URL}/login$`));
	await browser.locator('[data-turnstile-widget]').tap({ position: CHECKBOX_OFFSET });

	await expect(browser).toHaveURL(new RegExp(`^${CHALLENGE_URL}/dashboard$`), { timeout: 15_000 });
});

test('a failed challenge says so and never posts the form', async ({ app, screen, browser }) => {
	await app.open(`${BLOCK_URL}/login`);
	await expect(screen.getByText(REJECTED)).toBeVisible({ timeout: 15_000 });
	await fillLogin(screen);
	await screen.getByRole('button', 'Se connecter').tap();

	await expect(screen.getByText(PENDING)).toBeVisible();
	await expect(screen.getByText(REJECTED)).toBeVisible({ timeout: 15_000 });
	await expect(browser).toHaveURL(new RegExp(`^${BLOCK_URL}/login$`));
	await expect(screen.getByRole('button', 'Se connecter')).toBeEnabled();
});

test('a blocked Turnstile script says how to recover and holds the form', async ({
	app,
	screen,
	browser,
}) => {
	await browser.route(TURNSTILE_SCRIPT, (route) => route.abort());
	await app.open('/login');
	await expect(screen.getByText(UNAVAILABLE)).toBeVisible();
	await fillLogin(screen);
	await screen.getByRole('button', 'Se connecter').tap();

	await expect(screen.getByText(UNAVAILABLE)).toBeVisible();
	await expect(browser).toHaveURL('/login');
});

test('a challenge that never answers releases the submit with a retry notice', async ({
	app,
	screen,
	browser,
}) => {
	// A widget that renders and then never calls back, like a challenge stuck on a slow network.
	await browser.route(TURNSTILE_SCRIPT, (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			body: 'window.turnstile = { render: () => "stalled", reset() {}, remove() {} };',
		}),
	);
	await app.open('/login');
	await fillLogin(screen);
	await screen.getByRole('button', 'Se connecter').tap();

	await expect(screen.getByText(PENDING)).toBeVisible();
	await expect(screen.getByText(SLOW)).toBeVisible({ timeout: 15_000 });
	await expect(browser).toHaveURL('/login');
	await expect(screen.getByRole('button', 'Se connecter')).toBeEnabled();
});
