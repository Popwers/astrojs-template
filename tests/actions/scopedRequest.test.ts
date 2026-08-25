import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import scopedRequest from '@actions/utility/scopedRequest';
import type { JsonValue } from '@interfaces/json';

import { codeOf, messageOf } from '../utils/actionError';
import { installFetchStub } from '../utils/fetchStub';

let originalFetch: typeof globalThis.fetch;
let originalError: typeof console.error;

/** Install a fetch stub resolving to the given Response (or throwing if a thunk throws). */
function stubFetch(response: Response | (() => never)) {
	installFetchStub(async () => (response instanceof Response ? response : response()));
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

describe('scopedRequest', () => {
	it('returns the payload on a successful response', async () => {
		stubFetch(jsonResponse({ jwt: 'token-1', user: { id: 1 } }));

		const result = await scopedRequest({ endpoint: 'auth/local', body: { identifier: 'a' } });

		// `result` is a Strapi union; compare structurally without narrowing it.
		expect<unknown>(result).toEqual({ jwt: 'token-1', user: { id: 1 } });
	});

	it('throws FORBIDDEN when the API returns a ForbiddenError', async () => {
		stubFetch(
			jsonResponse(
				{ error: { status: 403, name: 'ForbiddenError', message: 'Forbidden', details: {} } },
				403,
			),
		);

		try {
			await scopedRequest({ endpoint: 'users/2', body: {}, method: 'PUT' });
			throw new Error('expected scopedRequest to throw');
		} catch (error) {
			expect(codeOf(error)).toBe('FORBIDDEN');
		}
	});

	it('throws BAD_REQUEST for a non-forbidden API error', async () => {
		stubFetch(
			jsonResponse(
				{ error: { status: 400, name: 'ValidationError', message: 'Bad input', details: {} } },
				400,
			),
		);

		try {
			await scopedRequest({ endpoint: 'auth/local', body: {} });
			throw new Error('expected scopedRequest to throw');
		} catch (error) {
			expect(codeOf(error)).toBe('BAD_REQUEST');
		}
	});

	it('translates a known error message to French', async () => {
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
			await scopedRequest({ endpoint: 'auth/local', body: {} });
			throw new Error('expected scopedRequest to throw');
		} catch (error) {
			expect(messageOf(error)).toBe('Adresse email ou mot de passe incorrect');
		}
	});

	it('appends validation details to the error message', async () => {
		stubFetch(
			jsonResponse(
				{
					error: {
						status: 400,
						name: 'ValidationError',
						message: 'Validation error',
						details: { errors: ['email is required'] },
					},
				},
				400,
			),
		);

		try {
			await scopedRequest({ endpoint: 'auth/local', body: {} });
			throw new Error('expected scopedRequest to throw');
		} catch (error) {
			expect(messageOf(error)).toContain('email is required');
		}
	});

	it('maps a network failure to a translated message', async () => {
		stubFetch(() => {
			throw new Error('fetch failed');
		});

		try {
			await scopedRequest({ endpoint: 'auth/local', body: {} });
			throw new Error('expected scopedRequest to throw');
		} catch (error) {
			expect(messageOf(error)).toBe(
				'Nous ne parvenons pas à récupérer les données sur le serveur, veuillez réessayer dans quelques instants',
			);
		}
	});
});
