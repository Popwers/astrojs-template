import type { AstroCookieSetOptions } from 'astro';

/**
 * @description Cookie expiration time
 */
const EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days

/**
 * @description Default options for cookies
 */
const BASE = {
	path: '/',
	secure: true,
	httpOnly: true,
	sameSite: 'lax',
} as const;

/**
 * @description Default options for cookies
 */
const DEFAULT_COOKIE_OPTIONS: AstroCookieSetOptions = {
	...BASE,
	expires: new Date(Date.now() + 1000 * EXPIRES_IN),
	maxAge: EXPIRES_IN,
};

/**
 * @description Default options for cookies to delete
 */
const DEFAULT_COOKIE_OPTIONS_DELETE: AstroCookieSetOptions = {
	...BASE,
};

export default DEFAULT_COOKIE_OPTIONS;
export { DEFAULT_COOKIE_OPTIONS_DELETE };
