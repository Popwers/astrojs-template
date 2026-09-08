import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fontsCss = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), '../../src/styles/fonts.css'),
	'utf8',
);

describe('latin-only variable fonts', () => {
	it('ships only the latin wght-normal faces', () => {
		expect(fontsCss).toContain('montserrat-latin-wght-normal.woff2');
		expect(fontsCss).toContain('raleway-latin-wght-normal.woff2');
		expect(fontsCss).toContain('font-display: swap');
	});

	it('does not reference unused unicode subsets', () => {
		expect(fontsCss).not.toContain('cyrillic');
		expect(fontsCss).not.toContain('vietnamese');
		expect(fontsCss).not.toContain('latin-ext');
		expect(fontsCss).not.toContain('italic');
	});
});
