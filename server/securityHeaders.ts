/**
 * Security headers sent on every response of the production server, prerendered pages and on-demand
 * routes alike. No `Strict-Transport-Security`: the Cloudflare zone is the only HSTS source.
 */

/** Turnstile loads its script and its challenge iframe from this origin. */
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

/** Sentry ingest hosts (`o123.ingest.de.sentry.io`): the browser SDK posts events and replays there. */
const SENTRY_INGEST = 'https://*.sentry.io';

/**
 * Pages that decode HEIC avatars: heic2any's Emscripten runtime builds functions with `new Function`
 * inside a blob worker, which inherits the page policy. Every other page refuses eval.
 */
const EVAL_ROUTES = new Set(['/dashboard/account']);

/** Headers that do not depend on the request. */
const STATIC_HEADERS: ReadonlyArray<[string, string]> = [
	['X-Content-Type-Options', 'nosniff'],
	['Referrer-Policy', 'strict-origin-when-cross-origin'],
	['X-Frame-Options', 'DENY'],
	[
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
	],
];

function originOf(url: string | undefined): string | null {
	if (!url) return null;
	try {
		return new URL(url).origin;
	} catch {
		return null;
	}
}

/**
 * Build the Content-Security-Policy of a page.
 *
 * `script-src` keeps `'unsafe-inline'`: the `<ClientRouter />` swaps pages without reloading, and
 * Astro inlines the server island and hydration scripts, so per-page hashes (Astro `security.csp`)
 * cannot cover them. It also allows `data:`: after each swap the router appends an empty
 * `data:application/javascript,` module to wait for the page's module scripts. The policy still pins
 * every script, frame, connection and image to known origins.
 * @param pathname - Request path, to grant eval to the avatar page only.
 * @param strapiUrl - CMS URL, whose origin serves avatar and content images.
 * @returns The header value.
 */
export function contentSecurityPolicy(pathname: string, strapiUrl: string | undefined): string {
	const strapi = originOf(strapiUrl);
	const scripts = ["'self'", "'unsafe-inline'", 'data:', TURNSTILE_ORIGIN];
	if (EVAL_ROUTES.has(pathname)) scripts.push("'unsafe-eval'");
	const directives = [
		"default-src 'self'",
		`script-src ${scripts.join(' ')}`,
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' data: blob:${strapi ? ` ${strapi}` : ''}`,
		"font-src 'self'",
		`connect-src 'self' ${SENTRY_INGEST}`,
		`frame-src ${TURNSTILE_ORIGIN}`,
		"worker-src 'self' blob:",
		"manifest-src 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	];
	return directives.join('; ');
}

/**
 * The security headers for one request.
 * @param pathname - Request path.
 * @param strapiUrl - CMS URL (`STRAPI_URL`).
 * @returns Header name and value pairs.
 */
export function securityHeaders(pathname: string, strapiUrl: string | undefined): Array<[string, string]> {
	return [...STATIC_HEADERS, ['Content-Security-Policy', contentSecurityPolicy(pathname, strapiUrl)]];
}
