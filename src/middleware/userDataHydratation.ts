import { COOKIE_SESSION_ROUTES } from '@data/routes';
import type { FetchProps, StrapiError } from '@interfaces/strapi';
import type { User } from '@interfaces/user';
import { matchesAnyRoute } from '@lib/pathMatch';
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

/** A slow CMS must not hold every page: past this, the cookie user keeps serving. */
const USER_REFRESH_TIMEOUT_MS = 5000;

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

			if (cookieUser) context.locals.user = cookieUser;

			// Revalidate every page request against Strapi so blocked/deleted accounts cannot linger on an
			// unsigned timestamp window. Islands and actions reuse that result: see COOKIE_SESSION_ROUTES.
			if (!matchesAnyRoute(context.url.pathname, COOKIE_SESSION_ROUTES)) {
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
	const userData = await loadUser({
		endpoint: 'users/me',
		token: context.locals.userToken,
		wrappedByKey: '',
		returnError: true,
		timeoutMs: USER_REFRESH_TIMEOUT_MS,
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

		/**
		 * Non-401 failure: keep the existing (stale) cookie data serving rather
		 * than logging the user out on a transient CMS blip. A persistent failure
		 * degrades quietly here — only logged, not surfaced. See
		 * docs/error-handling.md ("Middleware" + "Observability gap").
		 */
		console.error('Failed to refresh user data:', userData.error);
		return;
	}

	if (!isPersistableUser(userData)) {
		console.warn('Skipped user refresh because the API payload was incomplete.');
		return;
	}

	updateUserCookie(context.cookies, userData);
	context.locals.user = userData;
}
