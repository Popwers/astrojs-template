import { describe, expect, it } from 'vite-plus/test';

import { contentSecurityPolicy, securityHeaders } from '../../server/securityHeaders.ts';

// How the headers can fail: the app starts sending HSTS (Cloudflare owns it), eval leaks to pages
// other than the avatar one, the Strapi images are blocked, or a malformed STRAPI_URL breaks the policy.
const STRAPI = 'https://api.example.fr/';

const directive = (policy: string, name: string) =>
	policy
		.split('; ')
		.find((entry) => entry.startsWith(`${name} `))
		?.split(' ')
		.slice(1);

describe('securityHeaders', () => {
	const headers = new Map(securityHeaders('/', STRAPI));

	it('never sends HSTS', () => {
		expect([...headers.keys()].map((name) => name.toLowerCase())).not.toContain(
			'strict-transport-security',
		);
	});
});

describe('contentSecurityPolicy', () => {
	it('grants eval to the avatar page only', () => {
		expect(directive(contentSecurityPolicy('/dashboard/account', STRAPI), 'script-src')).toContain(
			"'unsafe-eval'",
		);
		for (const pathname of ['/', '/login', '/dashboard', '/dashboard/account/x']) {
			expect(directive(contentSecurityPolicy(pathname, STRAPI), 'script-src')).not.toContain(
				"'unsafe-eval'",
			);
		}
	});

	it('allows images from the Strapi origin, not its path', () => {
		expect(directive(contentSecurityPolicy('/', STRAPI), 'img-src')).toContain('https://api.example.fr');
	});

	it('keeps a valid policy when STRAPI_URL is unset or malformed', () => {
		for (const strapiUrl of [undefined, '', 'not a url']) {
			expect(directive(contentSecurityPolicy('/', strapiUrl), 'img-src')).toEqual([
				"'self'",
				'data:',
				'blob:',
			]);
		}
	});
});
