import { credentials, expect } from 'e2e';

import { test } from './fixtures';

test(
	'the agent logs in and opens the profile page',
	{ tags: ['agent'] },
	async ({ app, agent, screen, browser }) => {
		const reader = credentials.user('reader');
		await app.open('/login');

		await agent.act('log in with the email {email} and the password {password}', {
			params: { email: reader.username, password: reader.password },
		});
		await expect(browser).toHaveURL('/dashboard');

		await agent.act('open the personal information page');
		await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Mon profil');
	},
);
