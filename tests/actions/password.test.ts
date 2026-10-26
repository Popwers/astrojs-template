import { password } from '@actions/password';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { messageOf } from '../utils/actionError';
import { createActionContext, handlerOf } from '../utils/actionHandler';
import { fetchUrl, installFetchStub } from '../utils/fetchStub';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESET_INPUT = {
	code: 'reset-code',
	password: 'Nouveau-2026!',
	passwordConfirmation: 'Nouveau-2026!',
	'cf-turnstile-response': 'test-token',
};

let originalFetch: typeof globalThis.fetch;
let strapiCalls: number;

beforeEach(() => {
	originalFetch = globalThis.fetch;
	strapiCalls = 0;
	installFetchStub(async (input) => {
		if (fetchUrl(input) === SITEVERIFY_URL) return Response.json({ success: true });

		strapiCalls += 1;
		return Response.json({ jwt: 'token-1', user: { id: 1, email: 'a@b.com' } });
	});
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe('password.resetPassword rate limit', () => {
	it('refuses the sixth attempt within the hour before Strapi is called', async () => {
		const reset = handlerOf(password.resetPassword);
		for (let attempt = 0; attempt < 5; attempt += 1) {
			await reset(RESET_INPUT, createActionContext());
		}

		try {
			await reset(RESET_INPUT, createActionContext());
			throw new Error('expected the sixth reset to throw');
		} catch (error) {
			expect(messageOf(error)).toBe('Too many attempts. Please try again later.');
		}
		expect(strapiCalls).toBe(5);
	});
});
