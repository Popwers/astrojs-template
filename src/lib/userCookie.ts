import DEFAULT_COOKIE_OPTIONS from '@data/cookieOptions';
import type { JsonValue } from '@interfaces/json';
import type { User } from '@interfaces/user';
import type { AstroCookieSetOptions } from 'astro';

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
 * What `user_data` can hold once decoded: the cookie payload this module writes,
 * or any other JSON a stale or tampered cookie carries.
 */
type CookiePayload = JsonValue | CookieUser | undefined;

/**
 * Validates that cookie data has the minimum required fields for auth.
 */
const isValidCookieUser = (data: CookiePayload): data is CookieUser => {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

	return (
		typeof data.id === 'number' &&
		typeof data.documentId === 'string' &&
		typeof data.email === 'string' &&
		typeof data.username === 'string'
	);
};

/**
 * The cookie write surface this module needs. Astro's `AstroCookies` satisfies it; so does
 * an in-memory jar in tests.
 */
interface CookieWriter {
	set(name: string, value: CookieUser | string, options: AstroCookieSetOptions): void;
}

/**
 * The cookie read surface this module needs. Astro's `AstroCookies` satisfies it; so does
 * an in-memory jar in tests.
 */
interface CookieReader {
	get(name: string): { json: () => CookiePayload } | undefined;
}

/**
 * Updates the user_data cookie with minimal essential data.
 *
 * @param cookies - Astro cookies object.
 * @param newUserData - Fresh user data (can be full User or partial).
 * @returns Partial User for Astro.locals (only cookie fields).
 */
export const updateUserCookie = (cookies: CookieWriter, newUserData: Partial<User>): Partial<User> => {
	const cookieUser = extractCookieUser(newUserData);

	cookies.set('user_data', cookieUser, DEFAULT_COOKIE_OPTIONS);
	cookies.set('user_data_timestamp', Date.now().toString(), DEFAULT_COOKIE_OPTIONS);

	return expandCookieUser(cookieUser);
};

/**
 * Reads the minimal user from cookie and expands to User-like structure.
 */
export const getUserFromCookie = (cookies: CookieReader): Partial<User> | null => {
	try {
		const data = cookies.get('user_data')?.json();
		if (!isValidCookieUser(data)) return null;
		return expandCookieUser(data);
	} catch {
		return null;
	}
};

export type { CookieReader, CookieUser, CookieWriter };
