import { PRIVATE_ROUTES } from '@data/routes';
import { matchesAnyRoute } from '@lib/pathMatch';

import { PRIVATE_CACHE_CONTROL, PUBLIC_PAGE_CACHE_CONTROL } from '../../server/cacheControl.ts';

export { PRIVATE_CACHE_CONTROL, PUBLIC_PAGE_CACHE_CONTROL };

/** The cookie that carries the Strapi JWT: its presence alone keeps a response out of shared caches. */
export const SESSION_COOKIE_NAME = 'user_token';

/**
 * Whether a request carries the session cookie (possibly expired: it still never reads a shared copy).
 * @param cookieHeader - The request's `cookie` header.
 * @returns `true` when a cookie is named exactly {@link SESSION_COOKIE_NAME}.
 */
export function hasSessionCookie(cookieHeader: string | null): boolean {
	if (!cookieHeader) return false;
	return cookieHeader.split(';').some((pair) => pair.split('=')[0]?.trim() === SESSION_COOKIE_NAME);
}

/** What {@link pageCacheVerdict} looks at. */
export interface PageCacheFacts {
	method: string;
	pathname: string;
	/** The request carries the session cookie. */
	isSignedIn: boolean;
	status: number;
	/** The response's `content-type`, if any. */
	contentType: string | null;
	/** The response's `cache-control`, as the route set it. */
	cacheControl: string | null;
	/** The response sets a cookie. */
	hasSetCookie: boolean;
}

/** `public`: {@link PUBLIC_PAGE_CACHE_CONTROL}; `private`: {@link PRIVATE_CACHE_CONTROL}; `keep`: leave it. */
export type PageCacheVerdict = 'public' | 'private' | 'keep';

/**
 * Decide the caching of an on-demand response. Only pages (HTML and redirects) are judged: endpoints
 * set their own headers. A page is public only when it is a 200 `GET` rendered for a visitor without a
 * session, sets no cookie, and its route is not in `PRIVATE_ROUTES`. A route may opt out by setting
 * `private` / `no-store` itself, or pick another public policy by setting its own `public` value.
 * @param facts - The request and response facts.
 * @returns The verdict.
 */
export function pageCacheVerdict(facts: PageCacheFacts): PageCacheVerdict {
	const isHtml = facts.contentType?.startsWith('text/html') ?? false;
	const isRedirect = facts.status >= 300 && facts.status < 400;
	if (!isHtml && !isRedirect) return 'keep';

	const isRead = facts.method === 'GET' || facts.method === 'HEAD';
	const routeOptedOut = /\b(private|no-store)\b/.test(facts.cacheControl ?? '');
	const isShareable =
		isRead &&
		facts.status === 200 &&
		!facts.isSignedIn &&
		!facts.hasSetCookie &&
		!routeOptedOut &&
		!matchesAnyRoute(facts.pathname, PRIVATE_ROUTES);
	if (!isShareable) return 'private';
	return facts.cacheControl?.startsWith('public') ? 'keep' : 'public';
}
