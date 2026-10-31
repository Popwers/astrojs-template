import type { ClientContext } from '@lib/clientIp';
import { assertTurnstile } from '@lib/turnstile';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { codeOf, messageOf } from '../utils/actionError';
import { fetchUrl, installFetchStub } from '../utils/fetchStub';
import type { FetchInit, FetchInput } from '../utils/fetchStub';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VISITOR_MESSAGE = 'La vérification anti-robot a échoué. Veuillez réessayer.';
const UNAVAILABLE_MESSAGE =
	'La vérification anti-robot est indisponible pour le moment. Veuillez réessayer dans quelques instants.';

interface Call {
	url: string;
	method: string | undefined;
	form: URLSearchParams;
}

let originalFetch: typeof globalThis.fetch;
let originalError: typeof console.error;
let calls: Call[];
let errorLines: string[];

function contextWith(clientAddress?: string): ClientContext {
	return { request: { headers: { get: () => null } }, clientAddress };
}

function jsonResponse(body: Record<string, boolean | string[]>): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
}

function stubSiteverify(answer: () => Response | Promise<Response>): void {
	installFetchStub(async (input: FetchInput, init: FetchInit) => {
		const body = init?.body;
		if (!(body instanceof URLSearchParams))
			throw new Error('siteverify must receive a URLSearchParams body');

		calls.push({ url: fetchUrl(input), method: init?.method, form: body });
		return answer();
	});
}

async function rejection(promise: Promise<void>): Promise<{ code: string | null; message: string }> {
	try {
		await promise;
	} catch (error) {
		return { code: codeOf(error), message: messageOf(error) };
	}
	throw new Error('expected assertTurnstile to throw');
}

beforeEach(() => {
	originalFetch = globalThis.fetch;
	originalError = console.error;
	calls = [];
	errorLines = [];
	console.error = (...args: string[]) => {
		errorLines.push(args.join(' '));
	};
	delete process.env.TRUST_PROXY;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	console.error = originalError;
	delete process.env.TRUST_PROXY;
});

describe('assertTurnstile', () => {
	it('rejects an empty token without calling Cloudflare', async () => {
		stubSiteverify(() => jsonResponse({ success: true }));

		const failure = await rejection(assertTurnstile(contextWith('203.0.113.7'), ''));

		expect(failure).toEqual({ code: 'FORBIDDEN', message: VISITOR_MESSAGE });
		expect(calls).toHaveLength(0);
	});

	it('resolves on success and posts the secret and the token to siteverify', async () => {
		stubSiteverify(() => jsonResponse({ success: true }));

		await assertTurnstile(contextWith(), 'visitor-token');

		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe(SITEVERIFY_URL);
		expect(calls[0].method).toBe('POST');
		expect(calls[0].form.get('secret')).toBe('test-turnstile-secret');
		expect(calls[0].form.get('response')).toBe('visitor-token');
	});

	it('sends the resolved client IP as remoteip', async () => {
		stubSiteverify(() => jsonResponse({ success: true }));

		await assertTurnstile(contextWith('203.0.113.7'), 'visitor-token');

		expect(calls[0].form.get('remoteip')).toBe('203.0.113.7');
	});

	it('omits remoteip when no IP resolves', async () => {
		stubSiteverify(() => jsonResponse({ success: true }));

		await assertTurnstile(contextWith(), 'visitor-token');

		expect(calls[0].form.has('remoteip')).toBe(false);
	});

	it.each(['invalid-input-response', 'timeout-or-duplicate'])(
		'rejects the visitor on %s without logging',
		async (code) => {
			stubSiteverify(() => jsonResponse({ success: false, 'error-codes': [code] }));

			const failure = await rejection(assertTurnstile(contextWith(), 'visitor-token'));

			expect(failure).toEqual({ code: 'FORBIDDEN', message: VISITOR_MESSAGE });
			expect(errorLines).toEqual([]);
		},
	);

	it.each(['invalid-input-secret', 'internal-error'])(
		'reports %s as unavailable and logs it for the operator',
		async (code) => {
			stubSiteverify(() => jsonResponse({ success: false, 'error-codes': [code] }));

			const failure = await rejection(assertTurnstile(contextWith(), 'visitor-token'));

			expect(failure).toEqual({ code: 'SERVICE_UNAVAILABLE', message: UNAVAILABLE_MESSAGE });
			expect(errorLines).toHaveLength(1);
			expect(errorLines[0]).toContain(code);
		},
	);

	it('reports a failure without error codes as unavailable', async () => {
		stubSiteverify(() => jsonResponse({ success: false }));

		const failure = await rejection(assertTurnstile(contextWith(), 'visitor-token'));

		expect(failure.code).toBe('SERVICE_UNAVAILABLE');
	});

	it('reports a network failure as unavailable', async () => {
		stubSiteverify(() => {
			throw new TypeError('fetch failed');
		});

		const failure = await rejection(assertTurnstile(contextWith(), 'visitor-token'));

		expect(failure).toEqual({ code: 'SERVICE_UNAVAILABLE', message: UNAVAILABLE_MESSAGE });
		expect(errorLines).toHaveLength(1);
	});

	it('does not trust a body that comes with an HTTP error status', async () => {
		stubSiteverify(
			() =>
				new Response(JSON.stringify({ success: true }), {
					status: 500,
					headers: { 'content-type': 'application/json' },
				}),
		);

		const failure = await rejection(assertTurnstile(contextWith(), 'visitor-token'));

		expect(failure).toEqual({ code: 'SERVICE_UNAVAILABLE', message: UNAVAILABLE_MESSAGE });
		expect(errorLines).toEqual(['[turnstile] siteverify answered with HTTP 500']);
	});

	it('reports a non-JSON answer as unavailable', async () => {
		stubSiteverify(
			() =>
				new Response('<html>502 Bad Gateway</html>', {
					status: 502,
					headers: { 'content-type': 'text/html' },
				}),
		);

		const failure = await rejection(assertTurnstile(contextWith(), 'visitor-token'));

		expect(failure).toEqual({ code: 'SERVICE_UNAVAILABLE', message: UNAVAILABLE_MESSAGE });
	});
});
