import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { user } from '@actions/user';
import type { JsonValue } from '@interfaces/json';

import { createActionContext, handlerOf } from '../utils/actionHandler';
import { fetchUrl, installFetchStub, type FetchInit, type FetchInput } from '../utils/fetchStub';

type FetchCall = { url: string; method: string; headers: Headers };

let originalFetch: typeof globalThis.fetch;
let originalError: typeof console.error;
let calls: FetchCall[];

// Mint a fresh Response per call: a body can only be read once, and some
// handlers (email change) issue more than one request.
function stubJson(body: JsonValue, status = 200) {
	installFetchStub(async (input, init) => {
		recordCall(input, init);
		return new Response(JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json' },
		});
	});
}

// Record the request shape so tests can assert the method, target, and token
// without coupling to the response body.
function recordCall(input: FetchInput, init: FetchInit) {
	calls.push({ url: fetchUrl(input), method: init?.method ?? 'GET', headers: new Headers(init?.headers) });
}

function authedContext() {
	return createActionContext({ id: 9, documentId: 'doc-9', email: 'old@b.com', username: 'bob' }, 'jwt-9');
}

const anonContext = createActionContext();

beforeEach(() => {
	calls = [];
	originalFetch = globalThis.fetch;
	originalError = console.error;
	console.error = () => {};
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	console.error = originalError;
});

describe('user.profile', () => {
	it('rejects an unauthenticated request', async () => {
		let threw = false;
		try {
			await handlerOf(user.profile)({ username: 'bob' }, anonContext);
		} catch {
			threw = true;
		}
		expect(threw).toBe(true);
	});

	it('updates the username for an authenticated user', async () => {
		stubJson({ id: 9, username: 'bobby' });

		const result = await handlerOf(user.profile)({ username: 'bobby' }, authedContext());

		expect(result).toEqual({ id: 9, username: 'bobby' });
	});
});

describe('user.update', () => {
	it('returns only the user when the email is unchanged', async () => {
		stubJson({ id: 9, email: 'old@b.com', username: 'bobby' });

		const result = await handlerOf(user.update)(
			{ email: 'old@b.com', username: 'bobby' },
			authedContext(),
		);

		expect(result).toEqual({ user: { id: 9, email: 'old@b.com', username: 'bobby' } });
	});

	it('flags a pending confirmation when the email changes', async () => {
		stubJson({ id: 9, email: 'new@b.com', username: 'bob' });

		const result = await handlerOf(user.update)({ email: 'new@b.com', username: 'bob' }, authedContext());

		expect(result).toMatchObject({
			user: { email: 'new@b.com' },
			code: 'user-change-email',
		});
	});
});

describe('user.deleteAccount', () => {
	it('rejects an unauthenticated request without issuing a fetch', async () => {
		let threw = false;
		try {
			await handlerOf(user.deleteAccount)({ confirmation: 'true' }, anonContext);
		} catch {
			threw = true;
		}
		expect(threw).toBe(true);
		// requireAuth must short-circuit before any Strapi call.
		expect(calls.length).toBe(0);
	});

	it('issues a DELETE to the session user id with the session token', async () => {
		stubJson({});

		const result = await handlerOf(user.deleteAccount)({ confirmation: 'true' }, authedContext());

		expect(result).toEqual({
			disconnect: true,
			message: 'Your account has been permanently deleted.',
		});
		// The id comes from the session (9), never from client input.
		expect(calls[0]?.method).toBe('DELETE');
		expect(calls[0]?.url).toContain('/users/9');
		expect(calls[0]?.headers.get('Authorization')).toBe('Bearer jwt-9');
	});

	it('maps a Strapi error to a thrown ActionError', async () => {
		stubJson(
			{ error: { status: 400, name: 'ValidationError', message: 'Bad request', details: {} } },
			400,
		);

		let threw = false;
		try {
			await handlerOf(user.deleteAccount)({ confirmation: 'true' }, authedContext());
		} catch {
			threw = true;
		}
		expect(threw).toBe(true);
	});
});
