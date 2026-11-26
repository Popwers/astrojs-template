/**
 * @description Restricted routes when the user is logged in
 */
export const RESTRICTED_WHEN_LOGGED_IN = [
	'/login',
	'/register',
	'/register/mail-confirmation',
	'/lost-password',
	'/lost-password/reset',
	'/lost-password/wait-mail',
];

/**
 * @description Restricted routes when the user is logged out
 */
export const RESTRICTED_WHEN_LOGGED_OUT = ['/dashboard', '/dashboard/account', '/register/profil'];

/**
 * @description Routes requiring the completion of the profile
 */
export const NEED_REGISTER_ROUTES = [
	'/dashboard',
	'/dashboard/account',
	'/register/profil',
	'/login',
	'/register',
	'/register/mail-confirmation',
	'/lost-password',
	'/lost-password/reset',
	'/lost-password/wait-mail',
];

/**
 * @description Requests that answer from the session cookie alone: the server islands render the
 * signed cookie user, and an action's own Strapi call carries the user's JWT, so a blocked or deleted
 * account is refused there. The page request that led to them already revalidated the user. Prefix match.
 */
export const COOKIE_SESSION_ROUTES = ['/_server-islands', '/_actions'];

/**
 * @description Routes a shared cache never stores (`private, no-store`), on top of every request with a
 * session cookie: the auth flow (its HTML depends on the session and carries reset codes), the dashboard,
 * the server islands (per-visitor markup) and the actions. Prefix match: nested paths are private too.
 */
export const PRIVATE_ROUTES = [
	...RESTRICTED_WHEN_LOGGED_IN,
	...RESTRICTED_WHEN_LOGGED_OUT,
	...COOKIE_SESSION_ROUTES,
];
