import { describe, expect, it } from 'bun:test';

import middleware from '../../src/middleware/restrictedWhenNotLogged';

type CookieValue = string | number | Record<string, unknown>;
type TestUser = Record<string, unknown> | null;

interface TestContext {
	cookies: ReturnType<typeof createCookies>;
	locals: {
		user: TestUser;
		userToken: string;
	};
	url: URL;
	redirect: (path: string, status: number) => Response;
}

function createCookies(initialValues: Record<string, CookieValue>) {
	const store = new Map<string, CookieValue>(Object.entries(initialValues));

	return {
		has(name: string) {
			return store.has(name);
		},
		get(name: string) {
			if (!store.has(name)) return undefined;

			const value = store.get(name);
			return {
				value: typeof value === 'string' ? value : JSON.stringify(value),
				json: () => value,
			};
		},
		set(name: string, value: CookieValue) {
			store.set(name, value);
		},
		delete(name: string) {
			store.delete(name);
		},
		store,
	};
}

function createContext(path: string, initialCookies: Record<string, CookieValue>): TestContext {
	const cookies = createCookies(initialCookies);

	return {
		cookies,
		locals: {
			user: null,
			userToken: '',
		},
		url: new URL('https://example.com' + path),
		redirect(redirectPath: string, status: number) {
			return new Response(null, {
				status,
				headers: { Location: redirectPath },
			});
		},
	};
}

/** Runs the middleware and asserts it resolved to a Response (the runtime contract under test). */
async function run(context: TestContext, next: () => Promise<Response>): Promise<Response> {
	const result = await middleware(context as never, next);
	if (!(result instanceof Response)) {
		throw new Error('middleware did not return a Response');
	}
	return result;
}

describe('restrictedWhenNotLogged middleware', () => {
	it('redirects to /login when user_token cookie is missing on a protected path', async () => {
		const context = createContext('/dashboard', { user_data: { id: 1 } });

		let nextCalled = false;
		const response = await run(context, async () => {
			nextCalled = true;
			return new Response('ok');
		});

		expect(nextCalled).toBe(false);
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/login');
	});

	it('calls next when both cookies present and locals.user is complete', async () => {
		const context = createContext('/dashboard', {
			user_token: 'valid-token',
			user_data: { id: 1, documentId: 'doc-1', email: 'a@b.com', username: 'alice' },
		});
		context.locals.user = { id: 1, documentId: 'doc-1', email: 'a@b.com', username: 'alice' };
		context.locals.userToken = 'valid-token';

		let nextCalled = false;
		const response = await run(context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});

	it('deletes cookies, clears locals, and redirects to /login when locals.user is missing email', async () => {
		const context = createContext('/dashboard', {
			user_token: 'valid-token',
			user_data: { id: 1 },
		});
		// Both cookies are present but locals.user is incomplete (missing email)
		context.locals.user = { id: 1, documentId: 'doc-1', username: 'alice' };
		context.locals.userToken = 'valid-token';

		let nextCalled = false;
		const response = await run(context, async () => {
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
		const context = createContext('/', {});

		let nextCalled = false;
		const response = await run(context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});
});
