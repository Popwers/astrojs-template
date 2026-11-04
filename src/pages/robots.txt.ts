import type { APIRoute } from 'astro';

/**
 * AI training and SEO-tool crawlers that take content and send no visitor back.
 * Search, AI-answer, assistant and link-preview bots are not named: they follow `User-agent: *`.
 */
export const FREELOADING_CRAWLERS = [
	'Bytespider',
	'CCBot',
	'meta-externalagent',
	'Reflectionbot',
	'Barkrowler',
	'SERankingBacklinksBot',
	'AwarioBot',
];

const getRobotsTxt = (sitemapURL: URL) => `
User-agent: *
Allow: /

# AI training and SEO-tool crawlers that send no visitor back.
${FREELOADING_CRAWLERS.map((bot) => `User-agent: ${bot}`).join('\n')}
Disallow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
	const sitemapURL = new URL('sitemap-index.xml', site);
	return new Response(getRobotsTxt(sitemapURL));
};
