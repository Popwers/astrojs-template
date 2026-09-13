import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cookieBanner = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), '../../src/components/site/global/CookieBanner.astro'),
	'utf8',
);

describe('CookieBanner first-load cost', () => {
	it('does not import motion or Legend State on every page', () => {
		expect(cookieBanner).not.toContain("from 'motion'");
		expect(cookieBanner).not.toContain('from "motion"');
		expect(cookieBanner).not.toContain('@legendapp/state');
	});

	it('animates visibility with CSS transform and opacity', () => {
		expect(cookieBanner).toContain('transform: translateY');
		expect(cookieBanner).toContain('opacity 200ms');
		expect(cookieBanner).toContain('transform 200ms');
	});
});
