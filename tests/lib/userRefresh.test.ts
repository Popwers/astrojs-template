import type { User } from '@interfaces/user';
import { isPersistableUser, resolveUserAfterRefresh } from '@lib/userRefresh';
import { describe, expect, it } from 'vitest';

const createUser = (overrides: Partial<User> = {}): User => ({
	id: 1,
	documentId: 'user-document-id',
	email: 'john@example.com',
	provider: 'local',
	confirmed: true,
	blocked: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	publishedAt: null,
	username: 'john_doe',
	...overrides,
});

describe('user refresh helpers', () => {
	it('returns the refreshed user when the refresh succeeds', async () => {
		const refreshedUser = createUser({ username: 'jane_doe' });

		const result = await resolveUserAfterRefresh({
			currentUser: createUser(),
			fallbackUser: { username: 'fallback_user' },
			refresh: async () => refreshedUser,
			context: 'profile update',
		});

		expect(result?.username).toBe('jane_doe');
	});

	it('rejects incomplete users for persistence', () => {
		expect(
			isPersistableUser({
				id: 1,
				documentId: 'user-document-id',
				username: 'john_doe',
			}),
		).toBe(false);
		expect(isPersistableUser(createUser())).toBe(true);
	});

	it('falls back to merged data when the refresh throws', async () => {
		const errorCalls: unknown[][] = [];
		const previousConsoleError = console.error;
		console.error = (...args: unknown[]) => {
			errorCalls.push(args);
		};

		const result = await resolveUserAfterRefresh({
			currentUser: createUser(),
			fallbackUser: {
				username: 'fallback_user',
			},
			refresh: async () => {
				throw new Error('Request failed');
			},
			context: 'profile update',
		});

		console.error = previousConsoleError;

		expect(result?.username).toBe('fallback_user');
		expect(errorCalls.length).toBeGreaterThan(0);
	});

	it('falls back to merged data when the refreshed user payload is incomplete', async () => {
		const warnCalls: unknown[][] = [];
		const previousConsoleWarn = console.warn;
		console.warn = (...args: unknown[]) => {
			warnCalls.push(args);
		};

		const result = await resolveUserAfterRefresh({
			currentUser: createUser(),
			fallbackUser: null,
			refresh: async () => ({ id: 1 }),
			context: 'profile update',
		});

		console.warn = previousConsoleWarn;

		// Incomplete API payload is rejected — falls back to currentUser
		expect(result?.username).toBe('john_doe');
		expect(result?.id).toBe(1);
		expect(warnCalls.length).toBeGreaterThan(0);
	});
});
