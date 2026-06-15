import DEFAULT_COOKIE_OPTIONS from '@data/cookieOptions';
import type { User } from '@interfaces/user';
import type { AstroCookies } from 'astro';

/**
 * Minimal user data stored in cookie (~200 bytes).
 * Only for auth checks and basic UI display.
 * Full user data should always be fetched from the API on refresh.
 */
interface CookieUser {
	id: number;
	documentId: string;
	email: string;
	username: string;
	avatar_url: string | null;
}

/**
 * Extracts minimal fields from full User for cookie storage.
 * Throws if the four required identity fields are missing rather than silently writing
 * `undefined` to the cookie.
 */
const extractCookieUser = (user: Partial<User>): CookieUser => {
	if (
		user.id === undefined ||
		user.documentId === undefined ||
		user.email === undefined ||
		user.username === undefined
	) {
		throw new Error('extractCookieUser: missing required user fields (id, documentId, email, username)');
	}
	return {
		id: user.id,
		documentId: user.documentId,
		email: user.email,
		username: user.username,
		avatar_url: user.avatar?.url ?? null,
	};
};

/**
 * Expands CookieUser back to partial User structure for Astro.locals compatibility.
 */
const expandCookieUser = (cookie: CookieUser): Partial<User> => ({
	id: cookie.id,
	documentId: cookie.documentId,
	email: cookie.email,
	username: cookie.username,
	avatar: cookie.avatar_url ? { documentId: '', url: cookie.avatar_url } : undefined,
});

/**
 * Validates that cookie data has the minimum required fields for auth.
 */
const isValidCookieUser = (data: unknown): data is CookieUser => {
	if (!data || typeof data !== 'object') return false;
	const user = data as Partial<CookieUser>;
	return (
		typeof user.id === 'number' &&
		typeof user.documentId === 'string' &&
		typeof user.email === 'string' &&
		typeof user.username === 'string'
	);
};

/**
 * Updates the user_data cookie with minimal essential data.
 *
 * @param cookies - Astro cookies object.
 * @param newUserData - Fresh user data (can be full User or partial).
 * @returns Partial User for Astro.locals (only cookie fields).
 */
export const updateUserCookie = (cookies: AstroCookies, newUserData: Partial<User>): Partial<User> => {
	const cookieUser = extractCookieUser(newUserData);

	cookies.set('user_data', cookieUser, DEFAULT_COOKIE_OPTIONS);
	cookies.set('user_data_timestamp', Date.now().toString(), DEFAULT_COOKIE_OPTIONS);

	return expandCookieUser(cookieUser);
};

/**
 * Reads the minimal user from cookie and expands to User-like structure.
 */
export const getUserFromCookie = (cookies: AstroCookies): Partial<User> | null => {
	try {
		const data = cookies.get('user_data')?.json();
		if (!isValidCookieUser(data)) return null;
		return expandCookieUser(data);
	} catch {
		return null;
	}
};

export type { CookieUser };
