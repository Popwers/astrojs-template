import { expect } from 'e2e';

import { logIn, test } from './fixtures';

test('password checker grades the strength and flags a mismatched confirmation', async ({
	app,
	screen,
	browser,
}) => {
	await app.open('/register');
	const password = screen.getByLabel('Mot de passe', { exact: true });
	const confirmation = screen.getByLabel('Confirmer votre mot de passe');
	const strength = () =>
		browser.evaluate(() => document.querySelector('progress')?.value.toString() ?? null);

	await password.fill('abc');
	await expect.poll(strength).toBe('20');

	await password.fill('Abcdef1!x');
	await confirmation.fill('different');
	await expect.poll(strength).toBe('100');
	await expect
		.poll(() =>
			browser.evaluate(() => document.querySelector('#passwordConfirmation')?.className ?? null),
		)
		.toContain('border-red');

	await confirmation.fill('Abcdef1!x');
	await expect
		.poll(() =>
			browser.evaluate(() => document.querySelector('#passwordConfirmation')?.className ?? null),
		)
		.toContain('border-green');
});

test('password toggle reveals and hides the typed password', async ({ app, screen, browser }) => {
	await app.open('/login');
	await screen.getByLabel('Mot de passe').fill('secret');
	const inputType = () =>
		browser.evaluate(() => document.querySelector<HTMLInputElement>('#password')?.type ?? null);

	expect(await inputType()).toBe('password');
	await screen.getByRole('button', 'Voir le mot de passe').tap();
	await expect.poll(inputType).toBe('text');
	await screen.getByRole('button', 'Voir le mot de passe').tap();
	await expect.poll(inputType).toBe('password');
});

test('avatar upload previews the new image', async ({ app, screen, browser }) => {
	await logIn(app, screen, browser, 'reader');
	await app.open('/dashboard/account');

	await browser.locator('#avatar').setInputFiles('tests/e2e/fixtures/avatar.png');

	// The preview is an object URL, unlike the server-rendered avatar in the header.
	await expect
		.poll(() => browser.evaluate(() => document.querySelectorAll('img[src^="blob:"]').length))
		.toBe(1);
	await expect(screen.getByText('Changer l’image de profil')).toBeVisible();
});
