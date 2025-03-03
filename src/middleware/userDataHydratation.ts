import fetchApi from '@lib/strapi';
import { defineMiddleware } from 'astro/middleware';

import type { StrapiError } from '@interfaces/strapi';
import type { User } from '@interfaces/user';
import type { APIContext } from 'astro';

import DEFAULT_COOKIE_OPTIONS from '@data/cookieOptions';
import { REFRESH_INTERVAL } from '@data/userOptions';

/**
 * Hydrate the user data and token in the locals object
 */
export default defineMiddleware(async (context, next) => {
	try {
		if (context.cookies.has('user_data') && context.cookies.has('user_token')) {
			context.locals.userToken = context.cookies.get('user_token')?.value ?? '';

			const userDataCookie = context.cookies.get('user_data')?.json() ?? null;
			const lastUpdate = context.cookies.get('user_data_timestamp')?.value ?? null;
			const shouldRefresh = !lastUpdate || Date.now() - Number(lastUpdate) > REFRESH_INTERVAL;

			// Use cached data if it's fresh enough
			if (userDataCookie && !shouldRefresh) context.locals.user = userDataCookie;
			else await refreshUserData(context);
		}
	} catch (error) {
		console.error('Error in user data hydration:', error);
	}

	return next();
});

async function refreshUserData(context: APIContext) {
	const userData = (await fetchApi({
		endpoint: 'users/me',
		token: context.locals.userToken,
		wrappedByKey: '',
	})) as User | StrapiError;

	if ('error' in userData) {
		if (userData.error.status === 401) {
			context.cookies.delete('user_token');
			context.cookies.delete('user_data');
			context.cookies.delete('user_data_timestamp');
			return context.redirect('/login', 302);
		}
	} else {
		context.cookies.set('user_data', userData, DEFAULT_COOKIE_OPTIONS);
		context.cookies.set('user_data_timestamp', Date.now().toString(), DEFAULT_COOKIE_OPTIONS);
		context.locals.user = userData;
	}
}
