import { credentials, expect } from 'e2e';

import { logIn, test } from './fixtures';

test('logged-out visitor is sent from the dashboard to the login page', async ({ app, screen, browser }) => {
	await app.open('/dashboard');

	await expect(browser).toHaveURL('/login');
	await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Se connecter');
});

test('valid credentials open the dashboard and logging out closes it', async ({ app, screen, browser }) => {
	await logIn(app, screen, browser, 'reader');

	await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Mon compte');
	await expect(screen.getByRole('main')).toContainText('Jean Dupont');
	await expect(screen.getByRole('main')).toContainText('jean.dupont@example.com');

	await screen.getByRole('button', 'Se déconnecter').tap();
	await expect(browser).toHaveURL('/login');
	await app.open('/dashboard');
	await expect(browser).toHaveURL('/login');
});

test('wrong password is rejected on the login form', async ({ app, screen, browser }) => {
	await app.open('/login');
	await screen.getByLabel('Adresse mail').fill(credentials.user('reader').username);
	await screen.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
	await screen.getByRole('button', 'Se connecter').tap();

	await expect(screen.getByText('Adresse email ou mot de passe incorrect')).toBeVisible();
	await app.open('/dashboard');
	await expect(browser).toHaveURL('/login');
});
