import { NEED_REGISTER_ROUTES } from '@data/routes';
import { defineMiddleware } from 'astro/middleware';

/**
 * Check if the user has completed the registration process and redirect to the profil page if not
 */
export default defineMiddleware((context, next) => {
	if (context.locals.user) {
		const shouldUpdate = context.locals.user?.username?.includes('username_') ?? false;

		// If the user should update his profil and is not on the profil page and try to access a protected route, redirect to the profil page
		if (
			shouldUpdate &&
			context.url.pathname !== '/register/profil' &&
			NEED_REGISTER_ROUTES.includes(context.url.pathname)
		) {
			return context.redirect('/register/profil', 302);
		}

		// If the user has completed the registration process and is on the profil page, redirect to the dashboard
		if (!shouldUpdate && context.url.pathname === '/register/profil') {
			return context.redirect('/dashboard', 302);
		}
	}

	return next();
});
