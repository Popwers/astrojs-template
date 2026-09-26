import { expect, test } from './fixtures';

test('home page renders its content and the guest navigation', async ({ page, consoleErrors }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to Astro');
	await expect(page.getByRole('link', { name: "S'inscrire" })).toBeVisible();
	expect(consoleErrors()).toEqual([]);
});

test('header login link opens the login form', async ({ page, consoleErrors }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'Se connecter' }).click();

	await expect(page).toHaveURL('/login');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Se connecter');
	await expect(page.getByLabel('Adresse mail')).toBeEditable();
	expect(consoleErrors()).toEqual([]);
});

test('unknown URL answers 404 with a way back home', async ({ page }) => {
	const response = await page.goto('/cette-page-nexiste-pas');

	expect(response?.status()).toBe(404);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page non trouvée');
	await page.getByRole('link', { name: "Retourner à l'accueil" }).click();
	await expect(page).toHaveURL('/');
});
