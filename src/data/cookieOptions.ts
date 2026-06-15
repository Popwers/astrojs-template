import type { AstroCookieSetOptions } from 'astro';

/**
 * Cookie expiration time: 7 days in seconds.
 */
const EXPIRES_IN = 60 * 60 * 24 * 7;
const SHOULD_USE_SECURE_COOKIES = import.meta.env.PROD;

/**
 * Shared base cookie options (path, secure, httpOnly, sameSite).
 */
function createBaseCookieOptions(secure: boolean) {
	return {
		path: '/',
		secure,
		httpOnly: true,
		sameSite: 'lax',
	} as const satisfies AstroCookieSetOptions;
}

/**
 * Default options for setting authenticated-session cookies.
 */
function createCookieOptions(secure: boolean): AstroCookieSetOptions {
	return {
		...createBaseCookieOptions(secure),
		expires: new Date(Date.now() + 1000 * EXPIRES_IN),
		maxAge: EXPIRES_IN,
	};
}

/**
 * Default options for deleting cookies (no expiry, clears immediately).
 */
function createDeleteCookieOptions(secure: boolean): AstroCookieSetOptions {
	return {
		...createBaseCookieOptions(secure),
	};
}

const DEFAULT_COOKIE_OPTIONS = createCookieOptions(SHOULD_USE_SECURE_COOKIES);
const DEFAULT_COOKIE_OPTIONS_DELETE = createDeleteCookieOptions(SHOULD_USE_SECURE_COOKIES);

export default DEFAULT_COOKIE_OPTIONS;
export {
	createBaseCookieOptions,
	createCookieOptions,
	createDeleteCookieOptions,
	DEFAULT_COOKIE_OPTIONS_DELETE,
	EXPIRES_IN,
};
