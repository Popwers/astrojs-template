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
