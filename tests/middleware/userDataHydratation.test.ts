import { describe, expect, it } from 'bun:test';

import type { FetchProps, StrapiError } from '@interfaces/strapi';

import { getUserFromCookie } from '../../src/lib/userCookie';
import { hydrateUserData } from '../../src/middleware/userDataHydratation';
import { asApiContext, createMiddlewareContext } from '../utils/middlewareContext';

describe('userDataHydratation middleware', () => {
	it('redirects to login and clears the session when refresh returns 401', async () => {
		const context = createMiddlewareContext('/dashboard', {
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
			asApiContext(context),
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
		const context = createMiddlewareContext('/dashboard', {
			user_token: 'still-valid-token',
			user_data: cookieUser,
			user_data_timestamp: '0',
		});

		let nextCalled = false;
		const response = await hydrateUserData(
			asApiContext(context),
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

	it('always refreshes user data against the API', async () => {
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
		const context = createMiddlewareContext('/dashboard', {
			user_token: 'still-valid-token',
			user_data: cachedUser,
			user_data_timestamp: '0',
		});

		let receivedParams: FetchProps | undefined;

		const response = await hydrateUserData(
			asApiContext(context),
			async () => new Response('ok', { status: 200 }),
			async (params) => {
				receivedParams = params;
				return apiResponse;
			},
		);

		expect(response.status).toBe(200);
		// The refresh must populate the avatar relation so the cookie keeps avatar_url.
		expect(receivedParams?.query?.['populate[avatar][fields]']).toBe('url');
		// Full user data stored in locals
		expect(context.locals.user).toEqual(apiResponse);
		// Cookie stores only minimal auth data (HMAC-signed)
		expect(getUserFromCookie(context.cookies)).toEqual({
			id: 12,
			documentId: 'user-doc',
			email: 'user@example.com',
			username: 'user_12',
			avatar: { documentId: '', url: '/uploads/avatar.jpg' },
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
		const context = createMiddlewareContext('/dashboard', {
			user_token: 'still-valid-token',
			user_data: cookieUser,
			user_data_timestamp: '0',
		});

		const response = await hydrateUserData(
			asApiContext(context),
			async () => new Response('ok', { status: 200 }),
			async () => ({ id: 12 }), // Incomplete — missing documentId, email, username
		);

		expect(response.status).toBe(200);
		// Incomplete API payload rejected — locals keeps expanded cookie user
		expect(context.locals.user).toEqual(expandedCookieUser);
		// Cookie unchanged (still signed original payload)
		expect(getUserFromCookie(context.cookies)).toEqual(expandedCookieUser);
	});
});
