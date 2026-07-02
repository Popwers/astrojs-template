import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

// Resolve a path relative to this config file to an absolute path for Vitest aliases.
const fromRoot = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

/**
 * Default Vite+ config.
 *
 * fmt:    tabs/4/110, LF, single quotes, semis, all-trailing commas, JSX
 *         bracket on same line, arrow parens always, deterministic import
 *         order, Tailwind sorted, package.json sorted.
 * lint:   type-aware oxlint with a small curated rule set + Astro overrides.
 * staged: run `vp check --fix` on staged files (install via `vp config`).
 */
export default defineConfig({
	fmt: {
		useTabs: true,
		tabWidth: 4,
		printWidth: 110,
		endOfLine: 'lf',
		singleQuote: true,
		jsxSingleQuote: true,
		vueIndentScriptAndStyle: true,
		arrowParens: 'always',
		bracketSpacing: true,
		bracketSameLine: true,
		semi: true,
		quoteProps: 'as-needed',
		trailingComma: 'all',
		embeddedLanguageFormatting: 'auto',
		htmlWhitespaceSensitivity: 'css',
		proseWrap: 'preserve',
		sortImports: {
			groups: [
				'builtin',
				'external',
				['internal', 'subpath'],
				['parent', 'sibling', 'index'],
				'style',
				'unknown',
			],
			internalPattern: ['~/', '@/', '#'],
			newlinesBetween: true,
			order: 'asc',
			ignoreCase: true,
			sortSideEffects: false,
		},
		sortTailwindcss: true,
		sortPackageJson: true,
		ignorePatterns: [
			'**/cache',
			'**/caches',
			'**/log',
			'**/logs',
			'**/tmp',
			'**/temp',
			'**/backup',
			'**/backups',
			'**/dump',
			'**/dumps',
			'**/.git',
			'**/.svn',
			'**/.hg',
			'**/.cache',
			'**/.next',
			'**/*.md',
			'**/node_modules',
			'**/var',
			'**/vendor',
			'**/public',
			'**/dist',
			'**/build',
			'**/.contentlayer',
			'**/package.json',
			'**/package-lock.json',
			'**/.yarn',
			'**/yarn.lock',
			'**/.yarn-integrity',
			'**/.pnp.*',
			'**/bun.lockb',
			'**/*.min.css',
			'**/*.min.js',
			'**/patches/**',
		],
	},

	lint: {
		ignorePatterns: ['dist/**', '.cache/**', 'public/**', 'node_modules/**', '**/*.esm.js'],
		options: {
			typeAware: true,
			typeCheck: true,
		},
		// Curated overrides on top of oxlint `recommended`; keep the set tight.
		rules: {
			'no-param-reassign': 'error',
			'prefer-as-const': 'error',
			'no-else-return': 'error',
			'no-inferrable-types': 'error',
			'react/self-closing-comp': 'error',
			'prefer-number-properties': 'error',
			'no-explicit-any': 'error',
		},
		overrides: [
			{
				// Astro's generated types require a `/// <reference path>` directive.
				files: ['**/*.d.ts'],
				rules: {
					'triple-slash-reference': 'off',
				},
			},
			{
				files: ['**/*.astro'],
				rules: {
					'prefer-const': 'off',
					'consistent-type-imports': 'off',
					'no-unused-vars': 'off',
					'no-inferrable-types': 'off',
					'no-explicit-any': 'off',
					'no-unused-expressions': 'off',
					'prefer-number-properties': 'off',
				},
			},
		],
	},

	// Run on staged files at commit time. Hook is installed once with `vp config`.
	staged: {
		'*.{js,jsx,ts,tsx,vue,svelte,astro,json,css,scss,html,md}': 'vp check --fix',
	},

	// Vitest (`vp test`) needs the same path aliases as the app, plus a bun:test→vitest
	// shim, so it can resolve and run the suite that is otherwise authored against Bun's runner.
	test: {
		alias: {
			'@pages': fromRoot('./src/pages'),
			'@styles': fromRoot('./src/styles'),
			'@layouts': fromRoot('./src/layouts'),
			'@components': fromRoot('./src/components'),
			'@assets': fromRoot('./src/assets'),
			'@data': fromRoot('./src/data'),
			'@lib': fromRoot('./src/lib'),
			'@interfaces': fromRoot('./src/interfaces'),
			'@stores': fromRoot('./src/stores'),
			'@actions': fromRoot('./src/actions'),
			'bun:test': 'vitest',
			// Astro virtual modules have no runtime outside a build — resolve to test stubs.
			// (`astro:schema` needs no stub: schema files import `z` from `astro/zod`, a real subpath.)
			'astro:env/server': fromRoot('./tests/stubs/astroEnvServer.ts'),
			'astro:actions': fromRoot('./tests/stubs/astroActions.ts'),
		},
	},
});
