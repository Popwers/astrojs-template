import { describe, expect, it } from 'bun:test';

import { createStrapiError, isStrapiError, normalizeStrapiError } from '@lib/strapiError';

describe('strapiError helpers', () => {
	it('preserves native Strapi errors', () => {
		const error = createStrapiError(401, 'Session expired');

		expect(normalizeStrapiError(error, 401, 'fallback')).toEqual(error);
		expect(isStrapiError(error)).toBe(true);
	});

	it('normalizes unexpected payloads to a structured Strapi error', () => {
		const error = normalizeStrapiError(
			{
				error: {
					message: 'Backend unavailable',
				},
			},
			503,
			'API error: 503 on users/me',
		);

		expect(error).toEqual({
			data: null,
			error: {
				status: 503,
				name: 'ServerError',
				message: 'Backend unavailable',
				details: {},
			},
		});
	});

	it('falls back to message and name defaults when partial error shape is provided', () => {
		const error = normalizeStrapiError({ error: {} }, 400, 'fallback message');

		expect(error.error.message).toBe('fallback message');
		expect(error.error.name).toBe('APIError');
	});

	it('returns false for non-error payloads', () => {
		expect(isStrapiError(null)).toBe(false);
		expect(isStrapiError({ data: [] })).toBe(false);
		expect(isStrapiError({ error: { status: 'bad' } })).toBe(false);
	});
});
