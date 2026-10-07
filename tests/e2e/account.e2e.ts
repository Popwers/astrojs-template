import { expect } from 'e2e';

import { logIn, test } from './fixtures';

test('account page shows the signed-in profile', async ({ app, screen, browser }) => {
	await logIn(app, screen, browser, 'reader');
	await screen.getByRole('link', /Informations personnelles$/).tap();

	await expect(browser).toHaveURL('/dashboard/account');
	await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Mon profil');
	await expect(screen.getByLabel('Nom')).toHaveValue('Jean Dupont');
	await expect(screen.getByLabel('Adresse mail')).toHaveValue('jean.dupont@example.com');
});

test('profile update saves the new name', async ({ app, screen, browser }) => {
	await logIn(app, screen, browser, 'editor');
	await app.open('/dashboard/account');

	await screen.getByLabel('Nom').fill('Marie Sklodowska-Curie');
	await screen.getByRole('button', 'Enregistrer').tap();

	await expect(screen.getByText('Vos informations ont bien été mises à jour')).toBeVisible();
	await app.open('/dashboard/account');
	await expect(screen.getByLabel('Nom')).toHaveValue('Marie Sklodowska-Curie');
});
