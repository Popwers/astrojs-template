import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy, securityHeaders } from '../../server/securityHeaders.ts';

// How the headers can fail: a required header goes missing, the app starts sending HSTS (Cloudflare
// owns it), framing is allowed, eval leaks to pages other than the avatar one, Turnstile loses its
// script or frame origin, the Strapi images are blocked, or a malformed STRAPI_URL breaks the policy.
const STRAPI = 'https://api.example.fr/';

const directive = (policy: string, name: string) =>
	policy
		.split('; ')
		.find((entry) => entry.startsWith(`${name} `))
		?.split(' ')
		.slice(1);

describe('securityHeaders', () => {
	const headers = new Map(securityHeaders('/', STRAPI));

	it('sends nosniff, a referrer policy, a framing ban and a permissions policy', () => {
		expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(headers.get('X-Frame-Options')).toBe('DENY');
		expect(headers.get('Permissions-Policy')).toContain('camera=()');
	});

	it('never sends HSTS', () => {
		expect([...headers.keys()].map((name) => name.toLowerCase())).not.toContain(
			'strict-transport-security',
		);
	});
});

describe('contentSecurityPolicy', () => {
	it('forbids framing, plugins and base rewrites', () => {
		const policy = contentSecurityPolicy('/', STRAPI);
		expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
		expect(directive(policy, 'object-src')).toEqual(["'none'"]);
		expect(directive(policy, 'base-uri')).toEqual(["'self'"]);
	});

	it('lets Turnstile load its script and its iframe', () => {
		const policy = contentSecurityPolicy('/login', STRAPI);
		expect(directive(policy, 'script-src')).toContain('https://challenges.cloudflare.com');
		expect(directive(policy, 'frame-src')).toEqual(['https://challenges.cloudflare.com']);
	});

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
