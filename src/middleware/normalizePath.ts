import { normalizePathname } from '@lib/pathMatch';
import type { MiddlewareHandler } from 'astro';

/**
 * Redirect trailing-slash variants to the canonical path so auth guards see one shape.
 */
export const normalizePath: MiddlewareHandler = (context, next) => {
	const { pathname } = context.url;
	if (pathname.length > 1 && pathname.endsWith('/')) {
		const canonical = normalizePathname(pathname);
		const redirectUrl = new URL(context.url);
		redirectUrl.pathname = canonical;
		return context.redirect(redirectUrl.toString(), 301);
	}
	return next();
};

export default normalizePath;
