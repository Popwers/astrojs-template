import { expect } from 'e2e';

import { test } from './fixtures';

test('home page renders its content and the guest navigation', async ({ app, screen }) => {
	await app.open('/');

	await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Welcome to Astro');
	await expect(screen.getByRole('link', "S'inscrire")).toBeVisible();
});

test('header login link opens the login form', async ({ app, screen, browser }) => {
	await app.open('/');
	await screen.getByRole('link', 'Se connecter').tap();

	await expect(browser).toHaveURL('/login');
	await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Se connecter');
	await expect(screen.getByLabel('Adresse mail')).toBeEnabled();
	// e2e has no `toBeEditable`: an enabled input can still be read-only.
	const isReadOnly = await browser.evaluate(
		() => document.querySelector<HTMLInputElement>('input[type="email"]')?.readOnly === true,
	);
	expect(isReadOnly).toBe(false);
});

test('unknown URL answers 404 with a way back home', async ({ app, screen, browser }) => {
	await app.open('/cette-page-nexiste-pas');

	const response = await fetch(new URL('/cette-page-nexiste-pas', app.baseUrl));
	expect(response.status).toBe(404);
	await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Page non trouvée');
	await screen.getByRole('link', "Retourner à l'accueil").tap();
	await expect(browser).toHaveURL('/');
});
