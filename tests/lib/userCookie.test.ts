import { describe, expect, it } from 'bun:test';

import type { User } from '@interfaces/user';
import type { AstroCookies } from 'astro';

import { getUserFromCookie, updateUserCookie } from '../../src/lib/userCookie';

type CookieValue = string | number | Record<string, unknown>;

/**
 * Minimal in-memory stand-in for Astro's cookie API, exposing only the
 * `set`/`get`/`has`/`delete` surface the helper under test relies on.
 */
function createCookies(initialValues: Record<string, CookieValue> = {}) {
	const store = new Map<string, CookieValue>(Object.entries(initialValues));

	return {
		has(name: string) {
			return store.has(name);
		},
		get(name: string) {
			if (!store.has(name)) return undefined;
			const value = store.get(name);
			return {
				value: typeof value === 'string' ? value : JSON.stringify(value),
				json: () => value,
			};
		},
		set(name: string, value: CookieValue) {
			store.set(name, value);
		},
		delete(name: string) {
			store.delete(name);
		},
		store,
	};
}

const fullUser = {
	id: 7,
	documentId: 'doc-7',
	email: 'jane@example.com',
	username: 'jane',
	avatar: { documentId: 'a-1', url: 'https://cdn.example.com/avatar.png' },
	// Extra fields that must NOT leak into the cookie.
	provider: 'local',
	confirmed: true,
} as unknown as User;

describe('updateUserCookie', () => {
	it('writes both user_data and user_data_timestamp', () => {
		const cookies = createCookies();
		updateUserCookie(cookies as unknown as AstroCookies, fullUser);

		expect(cookies.store.has('user_data')).toBe(true);
		expect(cookies.store.has('user_data_timestamp')).toBe(true);
		expect(Number(cookies.store.get('user_data_timestamp'))).toBeGreaterThan(0);
	});

	it('stores only the five CookieUser fields, dropping extras', () => {
		const cookies = createCookies();
		updateUserCookie(cookies as unknown as AstroCookies, fullUser);

		const stored = cookies.store.get('user_data') as Record<string, unknown>;
		expect(Object.keys(stored).sort()).toEqual(
			['avatar_url', 'documentId', 'email', 'id', 'username'].sort(),
		);
		expect(stored.avatar_url).toBe('https://cdn.example.com/avatar.png');
		expect(stored).not.toHaveProperty('provider');
		expect(stored).not.toHaveProperty('confirmed');
	});

	it('round-trips a full user avatar back to avatar.url via the returned expanded user', () => {
		const cookies = createCookies();
		const expanded = updateUserCookie(cookies as unknown as AstroCookies, fullUser);

		expect(expanded.avatar?.url).toBe('https://cdn.example.com/avatar.png');
		expect(getUserFromCookie(cookies as unknown as AstroCookies)?.avatar?.url).toBe(
			'https://cdn.example.com/avatar.png',
		);
	});

	it('stores avatar_url as null when the user has no avatar', () => {
		const cookies = createCookies();
		const userWithoutAvatar = { ...fullUser, avatar: undefined } as User;
		updateUserCookie(cookies as unknown as AstroCookies, userWithoutAvatar);

		const stored = cookies.store.get('user_data') as Record<string, unknown>;
		expect(stored.avatar_url).toBeNull();
	});

	it('throws on a user missing a required identity field rather than writing undefined', () => {
		const cookies = createCookies();
		const userMissingEmail = {
			id: 7,
			documentId: 'doc-7',
			username: 'jane',
		} as unknown as User;

		expect(() => updateUserCookie(cookies as unknown as AstroCookies, userMissingEmail)).toThrow(
			/missing required user fields/,
		);
		expect(cookies.store.has('user_data')).toBe(false);
	});
});

describe('getUserFromCookie', () => {
	it('returns null when no cookie is present', () => {
		const cookies = createCookies();
		expect(getUserFromCookie(cookies as unknown as AstroCookies)).toBeNull();
	});

	it('returns null for a cookie missing required fields', () => {
		const cookies = createCookies({ user_data: { id: 1 } });
		expect(getUserFromCookie(cookies as unknown as AstroCookies)).toBeNull();
	});
});
