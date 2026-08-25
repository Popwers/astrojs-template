import { REFRESH_INTERVAL } from '@data/userOptions';
import type { FetchProps, StrapiError } from '@interfaces/strapi';
import type { User } from '@interfaces/user';
import { clearUserSession } from '@lib/session';
import { getUserFromCookie, updateUserCookie } from '@lib/userCookie';
import { isPersistableUser } from '@lib/userRefresh';
import type { APIContext, MiddlewareNext } from 'astro';
import { defineMiddleware } from 'astro/middleware';

/**
 * Loads the session user from the API. The payload is only trusted once
 * `isPersistableUser` has vouched for it, hence the partial contract.
 */
type LoadUser = (params: FetchProps) => Promise<Partial<User> | StrapiError>;

async function defaultLoadUser(params: FetchProps): Promise<User | StrapiError> {
	const { default: fetchApi } = await import('@lib/strapi');

	return await fetchApi<User | StrapiError>(params);
}

/**
 * Hydrate the user data and token in the locals object.
 * Cookie contains only minimal data (~200 bytes).
 * Full user data is fetched from API on refresh.
 */
export async function hydrateUserData(
	context: APIContext,
	next: MiddlewareNext,
	loadUser: LoadUser = defaultLoadUser,
) {
	try {
		if (context.cookies.has('user_data') && context.cookies.has('user_token')) {
			context.locals.userToken = context.cookies.get('user_token')?.value ?? '';

			const cookieUser = getUserFromCookie(context.cookies);
			const lastUpdate = context.cookies.get('user_data_timestamp')?.value ?? null;
			const shouldRefresh = !lastUpdate || Date.now() - Number(lastUpdate) > REFRESH_INTERVAL;

			// Cookie only has minimal data — set it as base
			if (cookieUser) context.locals.user = cookieUser;

			if (shouldRefresh) {
				const response = await refreshUserData(context, loadUser);
				if (response) return response;
			}
		}
	} catch (error) {
		console.error('Error in user data hydration:', error);
	}

	return next();
}

export default defineMiddleware((context, next) => hydrateUserData(context, next));

export async function refreshUserData(context: APIContext, loadUser: LoadUser = defaultLoadUser) {
	// Fetch full user data from API
	const userData = await loadUser({
		endpoint: 'users/me',
		token: context.locals.userToken,
		wrappedByKey: '',
		returnError: true,
		// Populate the avatar relation so the refreshed cookie keeps avatar_url;
		// otherwise Strapi omits the relation and updateUserCookie writes null.
		query: {
			'populate[avatar][fields]': 'url',
		},
	});

	if ('error' in userData) {
		if (userData.error.status === 401) {
			clearUserSession(context);
			return context.redirect('/login', 302);
		}

		// Non-401 failure: keep the existing (stale) cookie data serving rather
		// than logging the user out on a transient CMS blip. A persistent failure
		// degrades quietly here — only logged, not surfaced. See
		// docs/error-handling.md ("Middleware" + "Observability gap").
		console.error('Failed to refresh user data:', userData.error);
		return;
	}

	if (!isPersistableUser(userData)) {
		console.warn('Skipped user refresh because the API payload was incomplete.');
		return;
	}

	// Update cookie with minimal data, but store full user in locals
	updateUserCookie(context.cookies, userData);
	context.locals.user = userData;
}
