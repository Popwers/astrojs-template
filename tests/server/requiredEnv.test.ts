import { describe, expect, it } from 'vite-plus/test';

import { MIN_SECRET_LENGTH, missingEnv, REQUIRED_ENV, weakSecrets } from '../../server/requiredEnv.ts';

const complete = Object.fromEntries(REQUIRED_ENV.map((name) => [name, 'set']));

describe('missingEnv', () => {
	it('reports nothing when every required variable is set', () => {
		expect(missingEnv(complete)).toEqual([]);
	});

	it('names the variables that are unset or blank, in order, without their values', () => {
		const env = { ...complete, COOKIE_SIGNING_SECRET: '   ', TURNSTILE_SECRET_KEY: undefined };
		expect(missingEnv(env)).toEqual(['COOKIE_SIGNING_SECRET', 'TURNSTILE_SECRET_KEY']);
	});

	it('checks only the names it is given', () => {
		expect(missingEnv({}, ['ONLY_THIS'])).toEqual(['ONLY_THIS']);
	});
});

describe('weakSecrets', () => {
	it('accepts a secret of the minimum length', () => {
		expect(weakSecrets({ COOKIE_SIGNING_SECRET: 'x'.repeat(MIN_SECRET_LENGTH) })).toEqual([]);
	});

	it('names a secret one character short, never its value', () => {
		expect(weakSecrets({ COOKIE_SIGNING_SECRET: 'x'.repeat(MIN_SECRET_LENGTH - 1) })).toEqual([
			'COOKIE_SIGNING_SECRET',
		]);
	});

	it('leaves an unset or blank secret to missingEnv', () => {
		expect(weakSecrets({ COOKIE_SIGNING_SECRET: '  ' })).toEqual([]);
		expect(weakSecrets({})).toEqual([]);
	});
});
