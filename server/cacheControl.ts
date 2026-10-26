/**
 * `Cache-Control` values shared by the Astro middleware (on-demand pages) and the production server
 * (prerendered pages and files of `dist/client`). One module so both sides answer the same policy.
 */

/** Seconds a shared cache (Cloudflare) keeps the HTML of a public page. */
export const EDGE_TTL_SECONDS = 86_400;

/** Seconds a shared cache may still answer with an expired copy while it fetches a fresh one. */
export const STALE_WHILE_REVALIDATE_SECONDS = 604_800;

/**
 * Public HTML: browsers revalidate every time (`max-age=0`), the edge keeps it a day and serves it
 * stale for a week while it refreshes. Per-visitor markup lives in `server:defer` islands, which are
 * private, so the page itself is the same for everyone.
 */
export const PUBLIC_PAGE_CACHE_CONTROL = `public, max-age=0, s-maxage=${EDGE_TTL_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`;

/** Anything rendered for one visitor, or that must never be reused (errors, redirects, forms). */
export const PRIVATE_CACHE_CONTROL = 'private, no-store';

/** Content-hashed build assets (`/_astro/*`): the URL changes with the content. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Unhashed public files (`favicon.svg`, `robots.txt`, `sw.js`): always revalidated. */
export const REVALIDATE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
