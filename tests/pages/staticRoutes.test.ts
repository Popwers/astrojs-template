import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prerender as manifestPrerender } from '../../src/pages/manifest.webmanifest';
import { prerender as robotsPrerender } from '../../src/pages/robots.txt';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), '../../src/pages');

describe('static route prerender flags', () => {
	it('prerenders robots.txt at build time', () => {
		expect(robotsPrerender).toBe(true);
	});

	it('prerenders the web manifest at build time', () => {
		expect(manifestPrerender).toBe(true);
	});

	it('keeps the 404 page on SSR so `site` does not emit a host-canonical redirect', () => {
		const source = readFileSync(join(pagesDir, '404.astro'), 'utf8');
		expect(source).toContain('export const prerender = false');
	});
});
