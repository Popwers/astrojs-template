import { NEED_REGISTER_ROUTES } from '@data/routes';
import { defineMiddleware } from 'astro/middleware';

/**
 * Check if the user has completed the registration process and redirect to the
 * profile page if not. A username prefixed with `username_` is the Strapi default
 * and signals that the user has not yet set up their profile.
 */
export default defineMiddleware((context, next) => {
	if (context.locals.user) {
		const needsRegistration = context.locals.user?.username?.includes('username_') ?? false;

		// If the user has not completed registration and tries to access a protected route,
		// redirect to the registration page.
		if (
			needsRegistration &&
			context.url.pathname !== '/register/profil' &&
			NEED_REGISTER_ROUTES.includes(context.url.pathname)
		) {
			return context.redirect('/register/profil', 302);
		}

		// If the user has completed registration and is on the registration page,
		// redirect to the dashboard.
		if (!needsRegistration && context.url.pathname === '/register/profil') {
			return context.redirect('/dashboard', 302);
		}
	}

	return next();
});
