import { describe, expect, it } from 'bun:test';

import middleware from '../../src/middleware/checkRegistration';
import { createMiddlewareContext, runMiddleware } from '../utils/middlewareContext';

describe('checkRegistration middleware', () => {
	it('redirects to /register/profil when username starts with username_ on a NEED_REGISTER_ROUTES path', async () => {
		const context = createMiddlewareContext('/dashboard', {});
		context.locals.user = {
			id: 1,
			documentId: 'doc-1',
			email: 'a@b.com',
			username: 'username_abc123',
		};

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok');
		});

		expect(nextCalled).toBe(false);
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/register/profil');
	});

	it('calls next when incomplete-registration user is already on /register/profil', async () => {
		const context = createMiddlewareContext('/register/profil', {});
		context.locals.user = {
			id: 1,
			documentId: 'doc-1',
			email: 'a@b.com',
			username: 'username_abc123',
		};

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});

	it('redirects to /dashboard when a completed user lands on /register/profil', async () => {
		const context = createMiddlewareContext('/register/profil', {});
		context.locals.user = {
			id: 2,
			documentId: 'doc-2',
			email: 'john@example.com',
			username: 'john',
		};

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok');
		});

		expect(nextCalled).toBe(false);
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/dashboard');
	});

	it('calls next when there is no logged-in user, regardless of path', async () => {
		const context = createMiddlewareContext('/dashboard', {});
		// locals.user remains null (default)

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});
});
