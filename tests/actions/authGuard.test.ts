import { describe, expect, it } from 'bun:test';

import { requireAuth } from '@lib/authGuard';
import type { ActionAPIContext } from 'astro:actions';

const baseUser = { id: 1, documentId: 'doc-1', email: 'a@b.com', username: 'alice' };

function makeContext(user: unknown, userToken: string): ActionAPIContext {
	return {
		locals: { user, userToken },
		cookies: {},
	} as unknown as ActionAPIContext;
}

describe('requireAuth', () => {
	it('returns the user and token when both are present', () => {
		const result = requireAuth(makeContext(baseUser, 'jwt-123'));

		// `result.user` is the full `User` type; compare against the partial fixture.
		expect(result.user as unknown).toEqual(baseUser);
		expect(result.token).toBe('jwt-123');
	});

	it('throws UNAUTHORIZED when there is no user', () => {
		expect(() => requireAuth(makeContext(null, 'jwt-123'))).toThrow();
	});

	it('throws UNAUTHORIZED when the token is empty', () => {
		expect(() => requireAuth(makeContext(baseUser, ''))).toThrow();
	});

	it('surfaces the custom message on the thrown error', () => {
		expect(() => requireAuth(makeContext(null, ''), 'Custom auth message')).toThrow(
			'Custom auth message',
		);
	});

	it('sets the UNAUTHORIZED code on the thrown ActionError', () => {
		try {
			requireAuth(makeContext(null, ''));
			throw new Error('expected requireAuth to throw');
		} catch (error) {
			expect((error as { code?: string }).code).toBe('UNAUTHORIZED');
		}
	});
});
