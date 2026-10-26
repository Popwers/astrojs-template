import {
	hasSessionCookie,
	pageCacheVerdict,
	PRIVATE_CACHE_CONTROL,
	PUBLIC_PAGE_CACHE_CONTROL,
} from '@lib/pageCache';
import { defineMiddleware } from 'astro/middleware';

/**
 * Sets `Cache-Control` on every on-demand page (prerendered pages get theirs from `server/`):
 * public at the edge for an anonymous 200, `private, no-store` for a session, an error, a redirect,
 * a form result or a route of `PRIVATE_ROUTES`. First in the chain so it also sees the guards' redirects.
 */
export default defineMiddleware(async (context, next) => {
	const response = await next();
	const verdict = pageCacheVerdict({
		method: context.request.method,
		pathname: context.url.pathname,
		isSignedIn: hasSessionCookie(context.request.headers.get('cookie')),
		status: response.status,
		contentType: response.headers.get('content-type'),
		cacheControl: response.headers.get('cache-control'),
		// Astro appends the cookies a page set only when the adapter writes the response.
		hasSetCookie: response.headers.has('set-cookie') || !context.cookies.headers().next().done,
	});
	if (verdict === 'public') response.headers.set('Cache-Control', PUBLIC_PAGE_CACHE_CONTROL);
	if (verdict === 'private') response.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
	return response;
});
