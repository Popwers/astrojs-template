/**
 * Normalise URL paths for auth guards: collapse trailing slashes (except root).
 */
export function normalizePathname(pathname: string): string {
	if (pathname.length > 1 && pathname.endsWith('/')) {
		return pathname.slice(0, -1);
	}
	return pathname;
}

/**
 * True when `pathname` equals `route` or is a nested path under it.
 */
export function matchesRoutePrefix(pathname: string, route: string): boolean {
	const path = normalizePathname(pathname);
	const base = normalizePathname(route);
	return path === base || path.startsWith(`${base}/`);
}

/**
 * True when `pathname` matches any route in the list (exact or nested prefix).
 */
export function matchesAnyRoute(pathname: string, routes: readonly string[]): boolean {
	return routes.some((route) => matchesRoutePrefix(pathname, route));
}
