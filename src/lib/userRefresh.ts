import type { JsonValue } from '@interfaces/json';
import type { User } from '@interfaces/user';

/**
 * What can be offered as a user before it is known to be complete: a decoded API
 * payload, the partial user rebuilt from the cookie, or nothing.
 */
type UserPayload = JsonValue | Partial<User> | null | undefined;

const isPersistableUser = (value: UserPayload): value is User => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

	return (
		typeof value.id === 'number' &&
		typeof value.documentId === 'string' &&
		value.documentId.length > 0 &&
		typeof value.email === 'string' &&
		value.email.length > 0 &&
		typeof value.username === 'string' &&
		value.username.length > 0
	);
};

/**
 * Merge the session user with the fields rebuilt from the cookie. The result is only
 * as complete as its inputs, hence the partial contract.
 */
const mergeUsers = (currentUser?: User | null, fallbackUser?: Partial<User> | null): Partial<User> | null => {
	if (!currentUser && !fallbackUser) return null;

	return {
		...currentUser,
		...fallbackUser,
	};
};

const resolveUserAfterRefresh = async ({
	currentUser,
	fallbackUser,
	refresh,
	context,
}: {
	currentUser?: User | null;
	fallbackUser?: Partial<User> | null;
	refresh: () => Promise<UserPayload>;
	context: string;
}): Promise<Partial<User> | null> => {
	try {
		const refreshedUser = await refresh();
		if (isPersistableUser(refreshedUser)) return refreshedUser;
		if (refreshedUser) {
			console.warn(`Skipped refreshed user payload after ${context} because it was incomplete.`);
		}
	} catch (error) {
		console.error(`Failed to refresh user after ${context}:`, error);
	}

	return mergeUsers(currentUser, fallbackUser);
};

export { isPersistableUser, mergeUsers, resolveUserAfterRefresh };
