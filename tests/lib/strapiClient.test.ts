import { describe, expect, it } from 'bun:test';

import type { JsonArray, JsonObject } from '@interfaces/json';
import { createFetchFallback, createSubmitFallback, parseApiResponseBody } from '@lib/strapiClient';

describe('strapiClient helpers', () => {
	it('parses valid JSON even when the content-type is not JSON', async () => {
		const response = new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: {
				'content-type': 'text/plain',
			},
		});

		const parsed = await parseApiResponseBody(response);

		expect(parsed.hasBody).toBe(true);
		expect(parsed.parseError).toBe(false);
		expect(parsed.payload).toEqual({ ok: true });
	});

	it('returns an empty-body result for successful empty responses', async () => {
		const parsed = await parseApiResponseBody(new Response(null, { status: 204 }));

		expect(parsed.hasBody).toBe(false);
		expect(parsed.parseError).toBe(false);
		expect(parsed.payload).toBeUndefined();
	});

	it('flags non-json success payloads without throwing', async () => {
		const parsed = await parseApiResponseBody(
			new Response('created', {
				status: 200,
				headers: {
					'content-type': 'text/plain',
				},
			}),
		);

		expect(parsed.hasBody).toBe(true);
		expect(parsed.parseError).toBe(true);
		expect(parsed.payload).toBeUndefined();
	});

	it('builds the legacy fetch fallback shapes', () => {
		expect(createFetchFallback<JsonArray>({ wrappedByKey: 'data' })).toEqual([]);
		expect(createFetchFallback<JsonObject>({ wrappedByList: true })).toEqual({});
		expect(createFetchFallback<JsonObject>({})).toEqual({});
	});

	it('builds an empty submit fallback', () => {
		expect(createSubmitFallback<JsonObject>()).toEqual({});
	});
});
