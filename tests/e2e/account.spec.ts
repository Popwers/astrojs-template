import { EDITOR, READER } from './accounts';
import { expect, logIn, test } from './fixtures';

test('account page shows the signed-in profile', async ({ page, consoleErrors }) => {
	await logIn(page, READER);
	await page.getByRole('link', { name: 'Informations personnelles' }).click();

	await expect(page).toHaveURL('/dashboard/account');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mon profil');
	await expect(page.getByLabel('Nom')).toHaveValue('Jean Dupont');
	await expect(page.getByLabel('Adresse mail')).toHaveValue('jean.dupont@example.com');
	expect(consoleErrors()).toEqual([]);
});

test('profile update saves the new name', async ({ page }) => {
	await logIn(page, EDITOR);
	await page.goto('/dashboard/account');

	await page.getByLabel('Nom').fill('Marie Sklodowska-Curie');
	await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();

	await expect(page.getByText('Vos informations ont bien été mises à jour')).toBeVisible();
	await page.goto('/dashboard/account');
	await expect(page.getByLabel('Nom')).toHaveValue('Marie Sklodowska-Curie');
});
