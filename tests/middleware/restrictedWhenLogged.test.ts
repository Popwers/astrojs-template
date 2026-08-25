import { describe, expect, it } from 'bun:test';

import middleware from '../../src/middleware/restrictedWhenLogged';
import { createMiddlewareContext, runMiddleware } from '../utils/middlewareContext';

describe('restrictedWhenLogged middleware', () => {
	it('redirects to /dashboard when both cookies are present on /login', async () => {
		const context = createMiddlewareContext('/login', {
			user_token: 'valid-token',
			user_data: { id: 1 },
		});

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok');
		});

		expect(nextCalled).toBe(false);
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/dashboard');
	});

	it('calls next when cookies are absent on /login', async () => {
		const context = createMiddlewareContext('/login', {});

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});

	it('calls next when both cookies are present on a non-listed path', async () => {
		const context = createMiddlewareContext('/dashboard', {
			user_token: 'valid-token',
			user_data: { id: 1 },
		});

		let nextCalled = false;
		const response = await runMiddleware(middleware, context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});
});
