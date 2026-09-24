import { READER } from './accounts';
import { expect, logIn, test } from './fixtures';

test('logged-out visitor is sent from the dashboard to the login page', async ({ page }) => {
	await page.goto('/dashboard');

	await expect(page).toHaveURL('/login');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Se connecter');
});

test('valid credentials open the dashboard and logging out closes it', async ({ page, consoleErrors }) => {
	await logIn(page, READER);

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mon compte');
	await expect(page.getByRole('main')).toContainText('Jean Dupont');
	await expect(page.getByRole('main')).toContainText('jean.dupont@example.com');

	await page.getByRole('button', { name: 'Se déconnecter' }).click();
	await expect(page).toHaveURL('/login');
	await page.goto('/dashboard');
	await expect(page).toHaveURL('/login');
	expect(consoleErrors()).toEqual([]);
});

test('wrong password is rejected on the login form', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Adresse mail').fill(READER.user.email);
	await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais-mot-de-passe');
	await page.getByRole('button', { name: 'Se connecter' }).click();

	await expect(page.getByText('Adresse email ou mot de passe incorrect')).toBeVisible();
	await page.goto('/dashboard');
	await expect(page).toHaveURL('/login');
});
