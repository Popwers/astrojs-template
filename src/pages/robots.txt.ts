import type { APIRoute } from 'astro';

const robotsTxt: string = `
User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', 'https://easydocimmo.fr').href}
`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
};
