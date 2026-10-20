import { expect } from 'e2e';
import type { Screen } from 'e2e';

import { test } from './fixtures';
import { REJECT_URL } from './servers';

const PASSWORD = 'Nouveau-2026!';
const CONFIRMATION_SENT = 'A confirmation email has been sent to your email address.';
const REJECTED = 'La vérification anti-robot a échoué. Veuillez réessayer.';
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

async function fillResetPassword(screen: Screen) {
	await screen.getByLabel('Nouveau mot de passe').fill(PASSWORD);
	await screen.getByLabel('Confirmer votre mot de passe').fill(PASSWORD);
}

interface RejectCase {
	form: string;
	path: string;
	cookie?: { name: string; value: string };
	fill: (screen: Screen) => Promise<void>;
	submit: string;
}

const rejectCases: RejectCase[] = [
	{
		form: 'login',
		path: '/login',
		fill: async (screen) => {
			await screen.getByLabel('Adresse mail').fill('jean.dupont@example.com');
			await screen.getByLabel('Mot de passe').fill('Lecteur-2026!');
		},
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
