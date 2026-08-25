import { describe, expect, it } from 'bun:test';

import middleware from '../../src/middleware/restrictedWhenNotLogged';
import { createMiddlewareContext, runMiddleware } from '../utils/middlewareContext';

describe('restrictedWhenNotLogged middleware', () => {
	it('redirects to /login when user_token cookie is missing on a protected path', async () => {
		const context = createMiddlewareContext('/dashboard', { user_data: { id: 1 } });

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok');
		});

		expect(nextCalled).toBe(false);
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/login');
	});

	it('calls next when both cookies present and locals.user is complete', async () => {
		const context = createMiddlewareContext('/dashboard', {
			user_token: 'valid-token',
			user_data: { id: 1, documentId: 'doc-1', email: 'a@b.com', username: 'alice' },
		});
		context.locals.user = { id: 1, documentId: 'doc-1', email: 'a@b.com', username: 'alice' };
		context.locals.userToken = 'valid-token';

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});

	it('deletes cookies, clears locals, and redirects to /login when locals.user is missing email', async () => {
		const context = createMiddlewareContext('/dashboard', {
			user_token: 'valid-token',
			user_data: { id: 1 },
		});
		// Both cookies are present but locals.user is incomplete (missing email)
		context.locals.user = { id: 1, documentId: 'doc-1', username: 'alice' };
		context.locals.userToken = 'valid-token';

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok');
		});

		expect(nextCalled).toBe(false);
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/login');
		expect(context.cookies.has('user_token')).toBe(false);
		expect(context.cookies.has('user_data')).toBe(false);
		expect(context.locals.user).toBeNull();
		expect(context.locals.userToken).toBe('');
	});

	it('calls next on an unprotected path even when cookies are missing', async () => {
		const context = createMiddlewareContext('/', {});

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});
});
