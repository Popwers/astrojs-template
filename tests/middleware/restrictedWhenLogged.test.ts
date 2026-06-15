import { describe, expect, it } from 'bun:test';

import middleware from '../../src/middleware/restrictedWhenLogged';

type CookieValue = string | number | Record<string, unknown>;

interface TestContext {
	cookies: ReturnType<typeof createCookies>;
	locals: {
		user: Record<string, unknown> | null;
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

describe('restrictedWhenLogged middleware', () => {
	it('redirects to /dashboard when both cookies are present on /login', async () => {
		const context = createContext('/login', {
			user_token: 'valid-token',
			user_data: { id: 1 },
		});

		let nextCalled = false;
		const response = await run(context, async () => {
			nextCalled = true;
			return new Response('ok');
		});

		expect(nextCalled).toBe(false);
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/dashboard');
	});

	it('calls next when cookies are absent on /login', async () => {
		const context = createContext('/login', {});

		let nextCalled = false;
		const response = await run(context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});

	it('calls next when both cookies are present on a non-listed path', async () => {
		const context = createContext('/dashboard', {
			user_token: 'valid-token',
			user_data: { id: 1 },
		});

		let nextCalled = false;
		const response = await run(context, async () => {
			nextCalled = true;
			return new Response('ok', { status: 200 });
		});

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
	});
});
