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
 * @description Routes a shared cache never stores (`private, no-store`), on top of every request with a
 * session cookie: the auth flow (its HTML depends on the session and carries reset codes), the dashboard,
 * the server islands (per-visitor markup) and the actions. Prefix match: nested paths are private too.
 */
export const PRIVATE_ROUTES = [
	...RESTRICTED_WHEN_LOGGED_IN,
	...RESTRICTED_WHEN_LOGGED_OUT,
	'/_server-islands',
	'/_actions',
];
