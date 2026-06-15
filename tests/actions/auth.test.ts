import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { auth } from '@actions/auth';
import type { ActionAPIContext } from 'astro:actions';

import { handlerOf } from '../utils/actionHandler';

let originalFetch: typeof globalThis.fetch;
let originalError: typeof console.error;

function stubFetch(response: Response | (() => never)) {
	globalThis.fetch = (async () =>
		typeof response === 'function' ? response() : response) as unknown as typeof globalThis.fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

/** Minimal context whose cookie deletes are recorded so logout's session clear is observable. */
function makeContext() {
	const deleted: string[] = [];
	const locals = { user: { id: 1 } as unknown, userToken: 'jwt-1' };
	const context = {
		cookies: { delete: (name: string) => deleted.push(name) },
		locals,
	} as unknown as ActionAPIContext;

	return { context, deleted, locals };
}

beforeEach(() => {
	originalFetch = globalThis.fetch;
	originalError = console.error;
	console.error = () => {};
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	console.error = originalError;
});

describe('auth.login', () => {
	it('returns the jwt/user payload on success', async () => {
		stubFetch(jsonResponse({ jwt: 'token-1', user: { id: 1, email: 'a@b.com' } }));

		const result = await handlerOf(auth.login)(
			{ email: 'a@b.com', password: 'secret123' },
			{} as ActionAPIContext,
		);

		expect(result).toEqual({ jwt: 'token-1', user: { id: 1, email: 'a@b.com' } });
	});

	it('throws when Strapi rejects the credentials', async () => {
		stubFetch(
			jsonResponse(
				{
					error: {
						status: 400,
						name: 'ValidationError',
						message: 'Invalid identifier or password',
						details: {},
					},
				},
				400,
			),
		);

		try {
			await handlerOf(auth.login)({ email: 'a@b.com', password: 'wrong' }, {} as ActionAPIContext);
			throw new Error('expected login to throw');
		} catch (error) {
			expect((error as Error).message).toBe('Adresse email ou mot de passe incorrect');
		}
	});
});

describe('auth.register', () => {
	it('returns the registered email on success', async () => {
		stubFetch(jsonResponse({ jwt: 'token-1', user: { id: 2, email: 'new@b.com' } }));

		const result = await handlerOf(auth.register)(
			{ email: 'new@b.com', password: 'secret123', master: undefined },
			{} as ActionAPIContext,
		);

		expect(result).toEqual({ email: 'new@b.com' });
	});
});

describe('auth.logout', () => {
	it('clears the session cookies and returns the disconnect flag', async () => {
		const { context, deleted, locals } = makeContext();

		const result = await handlerOf(auth.logout)(undefined, context);

		expect(result).toEqual({ disconnect: true, message: 'You are now logged out.' });
		expect(deleted).toContain('user_token');
		expect(deleted).toContain('user_data');
		expect(locals.user).toBeNull();
		expect(locals.userToken).toBe('');
	});
});
