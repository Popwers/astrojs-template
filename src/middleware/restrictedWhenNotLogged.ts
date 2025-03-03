import { RESTRICTED_WHEN_LOGGED_OUT } from '@data/routes';
import { defineMiddleware } from 'astro/middleware';

/**
 * Check if the user is logged in and redirect to the login page if not
 */
export default defineMiddleware((context, next) => {
	if (RESTRICTED_WHEN_LOGGED_OUT.includes(context.url.pathname)) {
		const userToken = context.cookies.has('user_token');
		const userData = context.cookies.has('user_data');

		// If the user is not logged in or have empty data, redirect to the login page
		if (!userToken || !userData) {
			return context.redirect('/login', 302);
		}

		if (
			!context.locals?.user ||
			!context.locals?.user?.id ||
			!context.locals?.user?.documentId ||
			!context.locals?.user?.email ||
			!context.locals?.user?.username ||
			context.locals?.userToken === ''
		) {
			// Delete the user data and token from the cookies and locals
			context.cookies.delete('user_data');
			context.cookies.delete('user_token');
			context.locals.user = null;
			context.locals.userToken = '';

			return context.redirect('/login', 302);
		}
	}

	return next();
});
