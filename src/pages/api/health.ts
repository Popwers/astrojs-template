import type { APIRoute } from 'astro';

// On demand: the Docker HEALTHCHECK probes the live process, not a file written at build.
export const prerender = false;

/** Liveness probe: answers without touching Strapi so a CMS outage never restarts the container. */
export const GET: APIRoute = () =>
	new Response('ok', {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
	});
