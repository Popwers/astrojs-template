import { describe, expect, it } from 'bun:test';

import type { User } from '@interfaces/user';

import { getUserFromCookie, updateUserCookie } from '../../src/lib/userCookie';
import { createTestCookies } from '../utils/cookieJar';

const fullUser: Partial<User> = {
	id: 7,
	documentId: 'doc-7',
	email: 'jane@example.com',
	username: 'jane',
	avatar: { documentId: 'a-1', url: 'https://cdn.example.com/avatar.png' },
	// Extra fields that must NOT leak into the cookie.
	provider: 'local',
	confirmed: true,
};

describe('updateUserCookie', () => {
	it('writes both user_data and user_data_timestamp', () => {
		const cookies = createTestCookies();
		updateUserCookie(cookies, fullUser);

		expect(cookies.store.has('user_data')).toBe(true);
		expect(cookies.store.has('user_data_timestamp')).toBe(true);
		expect(Number(cookies.store.get('user_data_timestamp'))).toBeGreaterThan(0);
	});

	it('stores only the five CookieUser fields, dropping extras', () => {
		const cookies = createTestCookies();
		updateUserCookie(cookies, fullUser);

		const stored = getUserFromCookie(cookies);
		expect(stored).toEqual({
			id: 7,
			documentId: 'doc-7',
			email: 'jane@example.com',
			username: 'jane',
			avatar: { documentId: '', url: 'https://cdn.example.com/avatar.png' },
		});
		expect(stored).not.toHaveProperty('provider');
		expect(stored).not.toHaveProperty('confirmed');
	});

	it('round-trips a full user avatar back to avatar.url via the returned expanded user', () => {
		const cookies = createTestCookies();
		const expanded = updateUserCookie(cookies, fullUser);

		expect(expanded.avatar?.url).toBe('https://cdn.example.com/avatar.png');
		expect(getUserFromCookie(cookies)?.avatar?.url).toBe('https://cdn.example.com/avatar.png');
	});

	it('stores avatar_url as null when the user has no avatar', () => {
		const cookies = createTestCookies();
		const userWithoutAvatar: Partial<User> = { ...fullUser, avatar: undefined };
		updateUserCookie(cookies, userWithoutAvatar);

		expect(getUserFromCookie(cookies)?.avatar).toBeUndefined();
	});

	it('throws on a user missing a required identity field rather than writing undefined', () => {
		const cookies = createTestCookies();
		const userMissingEmail: Partial<User> = {
			id: 7,
			documentId: 'doc-7',
			username: 'jane',
		};

		expect(() => updateUserCookie(cookies, userMissingEmail)).toThrow(/missing required user fields/);
		expect(cookies.store.has('user_data')).toBe(false);
	});
});

describe('getUserFromCookie', () => {
	it('returns null when no cookie is present', () => {
		const cookies = createTestCookies();
		expect(getUserFromCookie(cookies)).toBeNull();
	});

	it('returns null for a cookie missing required fields', () => {
		const cookies = createTestCookies({ user_data: { id: 1 } });
		expect(getUserFromCookie(cookies)).toBeNull();
	});

	it('returns null for a tampered unsigned cookie', () => {
		const cookies = createTestCookies({
			user_data: JSON.stringify({ id: 1, documentId: 'd', email: 'a@b.com', username: 'ab' }),
		});
		expect(getUserFromCookie(cookies)).toBeNull();
	});
});
