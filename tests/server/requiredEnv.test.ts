import { describe, expect, it } from 'vite-plus/test';

import { missingEnv, REQUIRED_ENV } from '../../server/requiredEnv.ts';

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
