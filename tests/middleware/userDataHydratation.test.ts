import { describe, expect, it } from 'bun:test';

import type { StrapiError } from '@interfaces/strapi';

import { hydrateUserData } from '../../src/middleware/userDataHydratation';

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

function createContext(initialCookies: Record<string, CookieValue>): TestContext {
	const cookies = createCookies(initialCookies);

	return {
		cookies,
		locals: {
			user: null,
			userToken: '',
		},
		url: new URL('https://example.com/dashboard'),
		redirect(path: string, status: number) {
			return new Response(null, {
				status,
				headers: {
					Location: path,
				},
			});
		},
	};
}

describe('userDataHydratation middleware', () => {
	it('redirects to login and clears the session when refresh returns 401', async () => {
		const context = createContext({
			user_token: 'expired-token',
			user_data: {
				id: 12,
				documentId: 'user-doc',
				email: 'user@example.com',
				username: 'user_12',
			},
			user_data_timestamp: '0',
		});

		let nextCalled = false;
		const response = await hydrateUserData(
			context as never,
			async () => {
				nextCalled = true;
				return new Response('ok');
			},
			async () =>
				({
					data: null,
					error: {
						status: 401,
						name: 'UnauthorizedError',
						message: 'Expired JWT',
						details: {},
					},
				}) satisfies StrapiError,
		);

		expect(nextCalled).toBe(false);
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/login');
		expect(context.cookies.has('user_token')).toBe(false);
		expect(context.cookies.has('user_data')).toBe(false);
		expect(context.locals.userToken).toBe('');
		expect(context.locals.user).toBeNull();
	});

	it('keeps the cached user when refresh fails with a non-auth error', async () => {
		// Cookie stores minimal CookieUser format
		const cookieUser = {
			id: 12,
			documentId: 'user-doc',
			email: 'user@example.com',
			username: 'user_12',
			avatar_url: null,
		};
		// Expanded cookie user for locals
		const expandedCookieUser = {
			id: 12,
			documentId: 'user-doc',
			email: 'user@example.com',
			username: 'user_12',
			avatar: undefined,
		};
		const context = createContext({
			user_token: 'still-valid-token',
			user_data: cookieUser,
			user_data_timestamp: '0',
		});

		let nextCalled = false;
		const response = await hydrateUserData(
			context as never,
			async () => {
				nextCalled = true;
				return new Response('ok', { status: 200 });
			},
			async () =>
				({
					data: null,
					error: {
						status: 500,
						name: 'ServerError',
						message: 'Strapi unavailable',
						details: {},
					},
				}) satisfies StrapiError,
		);

		expect(nextCalled).toBe(true);
		expect(response.status).toBe(200);
		expect(context.locals.user).toEqual(expandedCookieUser);
		expect(context.locals.userToken).toBe('still-valid-token');
		expect(context.cookies.has('user_token')).toBe(true);
	});

	it('refreshes user data when the timestamp is stale', async () => {
		const cachedUser = {
			id: 12,
			documentId: 'user-doc',
			email: 'user@example.com',
			username: 'user_12',
		};
		const apiResponse = {
			...cachedUser,
			avatar: { documentId: 'avatar-doc', url: '/uploads/avatar.jpg' },
		};
		const context = createContext({
			user_token: 'still-valid-token',
			user_data: cachedUser,
			user_data_timestamp: '0',
		});

		let receivedParams: { query?: Record<string, string> } | undefined;

		const response = await hydrateUserData(
			context as never,
			async () => new Response('ok', { status: 200 }),
			async (params) => {
				receivedParams = params;
				return apiResponse as never;
			},
		);

		expect(response.status).toBe(200);
		// The refresh must populate the avatar relation so the cookie keeps avatar_url.
		expect(receivedParams?.query?.['populate[avatar][fields]']).toBe('url');
		// Full user data stored in locals
		expect(context.locals.user).toEqual(apiResponse);
		// Cookie stores only minimal auth data
		expect(context.cookies.get('user_data')?.json()).toEqual({
			id: 12,
			documentId: 'user-doc',
			email: 'user@example.com',
			username: 'user_12',
			avatar_url: '/uploads/avatar.jpg',
		});
	});

	it('keeps the cached user when refresh succeeds with an incomplete payload', async () => {
		// Cookie stores minimal CookieUser format
		const cookieUser = {
			id: 12,
			documentId: 'user-doc',
			email: 'user@example.com',
			username: 'user_12',
			avatar_url: null,
		};
		// Expanded cookie user for locals (matches what getUserFromCookie returns)
		const expandedCookieUser = {
			id: 12,
			documentId: 'user-doc',
			email: 'user@example.com',
			username: 'user_12',
			avatar: undefined,
		};
		const context = createContext({
			user_token: 'still-valid-token',
			user_data: cookieUser,
			user_data_timestamp: '0',
		});

		const response = await hydrateUserData(
			context as never,
			async () => new Response('ok', { status: 200 }),
			async () => ({ id: 12 }) as never, // Incomplete — missing documentId, email, username
		);

		expect(response.status).toBe(200);
		// Incomplete API payload rejected — locals keeps expanded cookie user
		expect(context.locals.user).toEqual(expandedCookieUser);
		// Cookie unchanged
		expect(context.cookies.get('user_data')?.json()).toEqual(cookieUser);
	});
});
