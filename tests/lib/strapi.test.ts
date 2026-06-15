import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import type { StrapiError } from '@interfaces/strapi';
import fetchApi, { submitApi } from '@lib/strapi';

type FetchArgs = { url: string; init: RequestInit | undefined };

const STRAPI_BASE = 'http://strapi.test/api';

let calls: FetchArgs[];
let originalFetch: typeof globalThis.fetch;
let originalError: typeof console.error;
let originalWarn: typeof console.warn;
let warnCount: number;

/**
 * Install a fetch stub that records each call and resolves with the given Response.
 * `response` may be a factory so each test controls status, body, and headers.
 */
function stubFetch(response: Response | (() => Response | Promise<Response>) | (() => never)) {
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		calls.push({ url, init });
		return typeof response === 'function' ? await response() : response;
	}) as typeof globalThis.fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

function textResponse(body: string, status = 200): Response {
	return new Response(body, { status, headers: { 'content-type': 'text/html' } });
}

beforeEach(() => {
	calls = [];
	warnCount = 0;
	originalFetch = globalThis.fetch;
	originalError = console.error;
	originalWarn = console.warn;
	// Silence expected error/warn noise; count warns to assert the non-JSON branch.
	console.error = () => {};
	console.warn = () => {
		warnCount += 1;
	};
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	console.error = originalError;
	console.warn = originalWarn;
});

describe('fetchApi', () => {
	it('unwraps the default `data` key on a 200 JSON response', async () => {
		stubFetch(jsonResponse({ data: { id: 1, name: 'alice' } }));

		const result = await fetchApi<{ id: number; name: string }>({ endpoint: 'users/me' });

		expect(result).toEqual({ id: 1, name: 'alice' });
		expect(calls[0]?.url).toBe(`${STRAPI_BASE}/users/me`);
	});

	it('strips a leading slash from the endpoint when building the URL', async () => {
		stubFetch(jsonResponse({ data: {} }));

		await fetchApi({ endpoint: '/users' });

		expect(calls[0]?.url).toBe(`${STRAPI_BASE}/users`);
	});

	it('appends query parameters to the URL', async () => {
		stubFetch(jsonResponse({ data: {} }));

		await fetchApi({ endpoint: 'users', query: { 'filters[id]': '5', sort: 'name' } });

		const url = new URL(calls[0]?.url ?? '');
		expect(url.searchParams.get('filters[id]')).toBe('5');
		expect(url.searchParams.get('sort')).toBe('name');
	});

	it('sends the server token as a Bearer header by default', async () => {
		stubFetch(jsonResponse({ data: {} }));

		await fetchApi({ endpoint: 'users' });

		const headers = new Headers(calls[0]?.init?.headers);
		expect(headers.get('Authorization')).toBe('Bearer test-token');
	});

	it('prefers an explicit user token over the server token', async () => {
		stubFetch(jsonResponse({ data: {} }));

		await fetchApi({ endpoint: 'users', token: 'user-jwt' });

		const headers = new Headers(calls[0]?.init?.headers);
		expect(headers.get('Authorization')).toBe('Bearer user-jwt');
	});

	it('unwraps the first list item when wrappedByList is set', async () => {
		stubFetch(jsonResponse({ data: [{ id: 5 }, { id: 6 }] }));

		const result = await fetchApi<{ id: number }>({ endpoint: 'users', wrappedByList: true });

		expect(result).toEqual({ id: 5 });
	});

	it('returns the structured error on a 404 when returnError is true', async () => {
		stubFetch(
			jsonResponse(
				{ error: { status: 404, name: 'NotFoundError', message: 'Not found', details: {} } },
				404,
			),
		);

		const result = await fetchApi<StrapiError>({ endpoint: 'users/999', returnError: true });

		expect(result.error.status).toBe(404);
		expect(result.error.message).toBe('Not found');
	});

	it('returns the empty fallback on a 500 when returnError is false', async () => {
		stubFetch(jsonResponse({ error: { status: 500 } }, 500));

		const result = await fetchApi({ endpoint: 'users' });

		// Default wrappedByKey ('data') yields an array fallback.
		expect(result).toEqual([]);
	});

	it('warns and returns the fallback when a 200 body is not JSON', async () => {
		stubFetch(textResponse('<html>not json</html>'));

		const result = await fetchApi({ endpoint: 'users' });

		expect(result).toEqual([]);
		expect(warnCount).toBeGreaterThan(0);
	});

	it('returns a 500 structured error when fetch throws and returnError is true', async () => {
		stubFetch(() => {
			throw new Error('network down');
		});

		const result = await fetchApi<StrapiError>({ endpoint: 'users', returnError: true });

		expect(result.error.status).toBe(500);
		expect(result.error.message).toBe('network down');
	});
});

describe('submitApi', () => {
	it('returns the JSON payload as-is on success', async () => {
		stubFetch(jsonResponse({ jwt: 'token-1', user: { id: 1 } }));

		const result = await submitApi({ endpoint: 'auth/local', body: { identifier: 'a', password: 'b' } });

		// `result` is a Strapi union; compare structurally without narrowing it.
		expect(result as unknown).toEqual({ jwt: 'token-1', user: { id: 1 } });
	});

	it('sets Content-Type application/json for JSON submissions', async () => {
		stubFetch(jsonResponse({ ok: true }));

		await submitApi({ endpoint: 'auth/local', body: { identifier: 'a' } });

		const headers = new Headers(calls[0]?.init?.headers);
		expect(headers.get('Content-Type')).toBe('application/json');
		expect(typeof calls[0]?.init?.body).toBe('string');
	});

	it('returns a normalized error on a 400 response', async () => {
		stubFetch(
			jsonResponse(
				{ error: { status: 400, name: 'ValidationError', message: 'Bad input', details: {} } },
				400,
			),
		);

		const result = (await submitApi({ endpoint: 'auth/local', body: {} })) as StrapiError;

		expect(result.error.status).toBe(400);
		expect(result.error.message).toBe('Bad input');
	});

	it('returns a 502 error when a successful response is not JSON', async () => {
		stubFetch(textResponse('<html>gateway</html>'));

		const result = (await submitApi({ endpoint: 'auth/local', body: {} })) as StrapiError;

		expect(result.error.status).toBe(502);
	});

	it('returns a 500 error when fetch throws', async () => {
		stubFetch(() => {
			throw new Error('socket hang up');
		});

		const result = (await submitApi({ endpoint: 'auth/local', body: {} })) as StrapiError;

		expect(result.error.status).toBe(500);
		expect(result.error.message).toBe('socket hang up');
	});

	it('sends a FormData body without a JSON Content-Type for multipart submissions', async () => {
		stubFetch(jsonResponse({ id: 1 }));

		await submitApi({
			endpoint: 'upload',
			body: { ref: 'plugin::users-permissions.user', files: {} },
			contentType: 'multipart/form-data',
			token: 'user-jwt',
		});

		const headers = new Headers(calls[0]?.init?.headers);
		expect(calls[0]?.init?.body).toBeInstanceOf(FormData);
		expect(headers.get('Content-Type')).toBeNull();
		expect(headers.get('Accept')).toBe('application/json');
		expect(headers.get('Authorization')).toBe('Bearer user-jwt');
	});
});
