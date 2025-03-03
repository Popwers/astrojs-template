import { RESTRICTED_WHEN_LOGGED_IN } from '@data/routes';
import { defineMiddleware } from 'astro/middleware';

/**
 * If user is logged in, redirect to the dashboard
 * Cause we don't want user to be redirected to the login page when they are already logged in
 */
export default defineMiddleware((context, next) => {
	if (RESTRICTED_WHEN_LOGGED_IN.includes(context.url.pathname)) {
		const userToken = context.cookies.has('user_token');
		const userData = context.cookies.has('user_data');

		// If the user is logged in, redirect to the dashboard
		if (userToken && userData) return context.redirect('/dashboard', 302);
	}

	return next();
});
