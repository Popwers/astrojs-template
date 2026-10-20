import { auth } from '@actions/auth';
import type { JsonValue } from '@interfaces/json';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { codeOf, messageOf } from '../utils/actionError';
import { createActionContext, handlerOf } from '../utils/actionHandler';
import { fetchUrl, installFetchStub } from '../utils/fetchStub';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_TOKEN = { 'cf-turnstile-response': 'test-token' };

let originalFetch: typeof globalThis.fetch;
let originalError: typeof console.error;
let strapiCalls: number;

/**
 * Install a fetch stub that answers the Turnstile siteverify call with `siteverify` and every other
 * call with the given Strapi Response (or throws if a thunk throws).
 */
function stubFetch(
	response: Response | (() => never),
	siteverify: Response = jsonResponse({ success: true }),
) {
	strapiCalls = 0;
	installFetchStub(async (input) => {
		if (fetchUrl(input) === SITEVERIFY_URL) return siteverify.clone();

		strapiCalls += 1;
		return response instanceof Response ? response : response();
	});
}

function jsonResponse(body: JsonValue, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
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
			{ email: 'a@b.com', password: 'secret123', ...TURNSTILE_TOKEN },
			createActionContext(),
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
			await handlerOf(auth.login)(
				{ email: 'a@b.com', password: 'wrong', ...TURNSTILE_TOKEN },
				createActionContext(),
			);
			throw new Error('expected login to throw');
		} catch (error) {
			expect(messageOf(error)).toBe('Adresse email ou mot de passe incorrect');
		}
	});
});

describe('auth.login Turnstile gate', () => {
	it('rejects a refused token before Strapi is called', async () => {
		stubFetch(
			jsonResponse({ jwt: 'token-1', user: { id: 1, email: 'a@b.com' } }),
			jsonResponse({ success: false, 'error-codes': ['invalid-input-response'] }),
		);

		try {
			await handlerOf(auth.login)(
				{ email: 'a@b.com', password: 'secret123', ...TURNSTILE_TOKEN },
				createActionContext(),
			);
			throw new Error('expected login to throw');
		} catch (error) {
			expect(codeOf(error)).toBe('FORBIDDEN');
		}
		expect(strapiCalls).toBe(0);
	});
});

describe('auth.register', () => {
	it('returns the registered email on success', async () => {
		stubFetch(jsonResponse({ jwt: 'token-1', user: { id: 2, email: 'new@b.com' } }));

		const result = await handlerOf(auth.register)(
			{ email: 'new@b.com', password: 'secret123', master: undefined, ...TURNSTILE_TOKEN },
			createActionContext(),
		);

		expect(result).toEqual({ email: 'new@b.com' });
	});
});

describe('auth.logout', () => {
	it('clears the session cookies and returns the disconnect flag', async () => {
		const context = createActionContext({ id: 1 }, 'jwt-1', {
			user_token: 'jwt-1',
			user_data: { id: 1 },
		});

		const result = await handlerOf(auth.logout)(undefined, context);

		expect(result).toEqual({ disconnect: true, message: 'You are now logged out.' });
		expect(context.cookies.store.has('user_token')).toBe(false);
		expect(context.cookies.store.has('user_data')).toBe(false);
		expect(context.locals.user).toBeNull();
		expect(context.locals.userToken).toBe('');
	});
});
