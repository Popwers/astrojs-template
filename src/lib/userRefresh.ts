import type { User } from '@interfaces/user';

const isPersistableUser = (value: unknown): value is User => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

	const candidate = value as Partial<User>;

	return (
		typeof candidate.id === 'number' &&
		typeof candidate.documentId === 'string' &&
		candidate.documentId.length > 0 &&
		typeof candidate.email === 'string' &&
		candidate.email.length > 0 &&
		typeof candidate.username === 'string' &&
		candidate.username.length > 0
	);
};

const mergeUsers = (currentUser?: User | null, fallbackUser?: Partial<User> | null): User | null => {
	if (!currentUser && !fallbackUser) return null;

	return {
		...currentUser,
		...fallbackUser,
	} as User;
};

const resolveUserAfterRefresh = async ({
	currentUser,
	fallbackUser,
	refresh,
	context,
}: {
	currentUser?: User | null;
	fallbackUser?: Partial<User> | null;
	refresh: () => Promise<User | null>;
	context: string;
}): Promise<User | null> => {
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
