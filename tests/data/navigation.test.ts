import { describe, expect, it } from 'bun:test';

import { NEED_REGISTER_ROUTES, RESTRICTED_WHEN_LOGGED_IN, RESTRICTED_WHEN_LOGGED_OUT } from '@data/routes';

describe('Navigation route guards', () => {
	it('restricts dashboard access for unauthenticated users', () => {
		expect(RESTRICTED_WHEN_LOGGED_OUT).toContain('/dashboard');
	});

	it('restricts account page access for unauthenticated users', () => {
		expect(RESTRICTED_WHEN_LOGGED_OUT).toContain('/dashboard/account');
	});

	it('keeps the registration profile page reachable once the user is logged in', () => {
		expect(RESTRICTED_WHEN_LOGGED_OUT).toContain('/register/profil');
		expect(RESTRICTED_WHEN_LOGGED_IN).not.toContain('/register/profil');
	});

	it('redirects already-logged-in users away from auth pages', () => {
		expect(RESTRICTED_WHEN_LOGGED_IN).toContain('/login');
		expect(RESTRICTED_WHEN_LOGGED_IN).toContain('/register');
		expect(RESTRICTED_WHEN_LOGGED_IN).toContain('/register/mail-confirmation');
		expect(RESTRICTED_WHEN_LOGGED_IN).toContain('/lost-password');
	});

	it('requires profile completion before accessing the dashboard', () => {
		expect(NEED_REGISTER_ROUTES).toContain('/dashboard');
		expect(NEED_REGISTER_ROUTES).toContain('/dashboard/account');
	});
});
