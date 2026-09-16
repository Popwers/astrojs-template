import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('intent prefetch on above-the-fold links', () => {
	it('marks header logo and menu links for hover prefetch', () => {
		const navbar = readFileSync(join(root, 'src/components/site/global/navigation/Navbar.astro'), 'utf8');
		const menuItem = readFileSync(
			join(root, 'src/components/site/global/navigation/MenuItem.astro'),
			'utf8',
		);

		expect(navbar).toContain("data-astro-prefetch='hover'");
		expect(menuItem).toContain("data-astro-prefetch='hover'");
	});

	it('marks the login register CTA for hover prefetch', () => {
		const login = readFileSync(join(root, 'src/pages/login.astro'), 'utf8');
		expect(login).toContain("data-astro-prefetch='hover'");
	});
});
