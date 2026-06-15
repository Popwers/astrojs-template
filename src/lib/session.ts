import { DEFAULT_COOKIE_OPTIONS_DELETE } from '@data/cookieOptions';
import type { AstroCookies } from 'astro';

/**
 * Redirect destination used whenever we log the user out because we cannot trust
 * the current session state (e.g. Strapi sync failed). The login page reads the
 * `error` query string to display a server-unavailable banner.
 */
export const SERVER_UNAVAILABLE_REDIRECT = '/login?error=server-unavailable';

interface ClearUserSessionContext {
	cookies: AstroCookies;
	locals: App.Locals;
}

/**
 * Drop every piece of the authenticated session so the next request starts from a clean
 * slate. Used by middleware and pages that detect an unrecoverable state (stale cookie +
 * failing sync) and would rather force a re-login than silently display wrong data.
 */
export function clearUserSession(context: ClearUserSessionContext) {
	context.cookies.delete('user_token', DEFAULT_COOKIE_OPTIONS_DELETE);
	context.cookies.delete('user_data', DEFAULT_COOKIE_OPTIONS_DELETE);
	context.cookies.delete('user_data_timestamp', DEFAULT_COOKIE_OPTIONS_DELETE);
	context.locals.user = null as unknown as App.Locals['user'];
	context.locals.userToken = '';
}
