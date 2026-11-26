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
 * @description Action calls answer from the session cookie alone: the action's own Strapi call carries
 * the user's JWT, so a blocked or deleted account is refused there. Prefix match.
 */
export const COOKIE_SESSION_ROUTES = ['/_actions'];

/**
 * @description On-demand pages whose request revalidates the user with Strapi. A server island requested
 * from one of them reuses that result. Pages prerendered or not listed here (`/`, for one) never
 * revalidate, so their islands do. Prefix match.
 */
export const REVALIDATING_PAGES = [...RESTRICTED_WHEN_LOGGED_IN, ...RESTRICTED_WHEN_LOGGED_OUT];

/**
 * @description Routes a shared cache never stores (`private, no-store`), on top of every request with a
 * session cookie: the auth flow (its HTML depends on the session and carries reset codes), the dashboard,
 * the server islands (per-visitor markup) and the actions. Prefix match: nested paths are private too.
 */
export const PRIVATE_ROUTES = [
	...RESTRICTED_WHEN_LOGGED_IN,
	...RESTRICTED_WHEN_LOGGED_OUT,
	'/_server-islands',
	...COOKIE_SESSION_ROUTES,
];
