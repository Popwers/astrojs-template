import { describe, expect, it } from 'bun:test';

import type { User } from '@interfaces/user';
import { requireAuth } from '@lib/authGuard';

import { codeOf } from '../utils/actionError';
import { createActionContext } from '../utils/actionHandler';

const baseUser: Partial<User> = { id: 1, documentId: 'doc-1', email: 'a@b.com', username: 'alice' };

describe('requireAuth', () => {
	it('returns the user and token when both are present', () => {
		const result = requireAuth(createActionContext(baseUser, 'jwt-123'));

		// `result.user` is the full `User` type; compare against the partial fixture.
		expect<unknown>(result.user).toEqual(baseUser);
		expect(result.token).toBe('jwt-123');
	});

	it('throws UNAUTHORIZED when there is no user', () => {
		expect(() => requireAuth(createActionContext(null, 'jwt-123'))).toThrow();
	});

	it('throws UNAUTHORIZED when the token is empty', () => {
		expect(() => requireAuth(createActionContext(baseUser, ''))).toThrow();
	});

	it('surfaces the custom message on the thrown error', () => {
		expect(() => requireAuth(createActionContext(null, ''), 'Custom auth message')).toThrow(
			'Custom auth message',
		);
	});

	it('sets the UNAUTHORIZED code on the thrown ActionError', () => {
		try {
			requireAuth(createActionContext(null, ''));
			throw new Error('expected requireAuth to throw');
		} catch (error) {
			expect(codeOf(error)).toBe('UNAUTHORIZED');
		}
	});
});
