import { resolveCookieSigningSecret, signCookiePayload, verifySignedCookiePayload } from '@lib/signedCookie';
import { describe, expect, it } from 'vite-plus/test';

describe('resolveCookieSigningSecret', () => {
	it('returns the provided secret', () => {
		expect(resolveCookieSigningSecret('a-real-secret')).toBe('a-real-secret');
	});

	it('throws when the secret is missing', () => {
		expect(() => resolveCookieSigningSecret(undefined)).toThrow(/COOKIE_SIGNING_SECRET must be set/);
	});

	it('throws when the secret is empty or whitespace', () => {
		expect(() => resolveCookieSigningSecret('')).toThrow(/COOKIE_SIGNING_SECRET must be set/);
		expect(() => resolveCookieSigningSecret('   ')).toThrow(/COOKIE_SIGNING_SECRET must be set/);
	});
});

describe('signed cookie payloads', () => {
	it('round-trips a payload with the process secret', () => {
		const signed = signCookiePayload('{"id":1}');
		expect(verifySignedCookiePayload(signed)).toBe('{"id":1}');
	});

	it('rejects a tampered payload', () => {
		const signed = signCookiePayload('{"id":1}');
		expect(verifySignedCookiePayload(`${signed}x`)).toBeNull();
	});
});
