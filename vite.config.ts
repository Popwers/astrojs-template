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
			'.agent/**',
			'.agents/**',
			'.claude/**',
			'.codex/**',
			'.continue/**',
			'.cursor/**',
			'.gemini/**',
			'.opencode/**',
			'.pi/**',
			'.roo/**',
			'.windsurf/**',
			'tools/oxlint/anti-slop/**',
		],
	},

	lint: {
		ignorePatterns: [
			'dist/**',
			'.cache/**',
			'public/**',
			'node_modules/**',
			'**/*.esm.js',
			'.agent/**',
			'.agents/**',
			'.claude/**',
			'.codex/**',
			'.continue/**',
			'.cursor/**',
			'.gemini/**',
			'.opencode/**',
			'.pi/**',
			'.roo/**',
			'.windsurf/**',
			'tools/oxlint/anti-slop/**',
		],
		// Vendored anti-slop plugin (tools/oxlint/anti-slop) — rejects low-evidence TS patterns.
		jsPlugins: [{ name: 'anti-slop', specifier: './tools/oxlint/anti-slop/index.ts' }, '@shadcn/lint'],
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
			'anti-slop/no-chained-type-assertions': 'error',
			'anti-slop/no-conditional-empty-object-spread': 'error',
			'anti-slop/no-known-value-widening': 'error',
			'anti-slop/no-module-mocking': 'error',
			'anti-slop/no-object-parameters': 'error',
			'anti-slop/no-reflect-apply': 'error',
			'anti-slop/no-reflect-get': 'error',
			// `typeof` narrowing is allowed only inside named type guards / assertion functions.
			'anti-slop/no-runtime-typeof': ['error', { allowInTypeGuards: true }],
			'anti-slop/no-shape-in-symbol-names': 'error',
			'anti-slop/no-unknown-parameters': 'error',
			'anti-slop/no-unknown-returns': 'error',
			'anti-slop/no-unknown-type-aliases': 'error',
			'anti-slop/no-unsafe-dictionary-type': 'error',
			'anti-slop/no-widen-then-assert': 'error',
			'anti-slop/require-safety-comment-for-type-assertion': 'error',
			'shadcn/no-restyle': ['error', { allow: ['layout'] }],
			'shadcn/no-raw-colors': 'error',
			'shadcn/no-arbitrary-values': 'error',
			'shadcn/no-inline-styles': 'error',
			'shadcn/no-unknown-classes': 'error',
			'shadcn/require-static-classes': 'error',
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
			{
				files: ['**/components/ui/**', '**/src/components/ui/**'],
				rules: {
					'shadcn/no-restyle': 'off',
				},
			},
			{
				// SCSS primitives (btn, form-group, h3, …) live outside the Tailwind theme graph.
				files: ['src/**/*.{astro,tsx}'],
				rules: {
					'shadcn/no-unknown-classes': [
						'error',
						{
							allow: [
								'btn',
								'button',
								'form-group',
								'h1',
								'h2',
								'h3',
								'h4',
								'h5',
								'h6',
								'secondary',
								'tertiary',
								'bordered',
								'fit',
								'starter',
								'primary',
								'disabled',
								'cookie-layer',
								'cookie-banner',
								'cookie-modal',
								'menu-button',
								'menu-line-1',
								'menu-line-2',
								'menu-line-3',
								'menu',
								'haveSubmenus',
								'isFooter',
								'submenus',
								'dash-rise',
								'is-visible',
								'title',
							],
						},
					],
				},
			},
			{
				// Legend State `$className` callbacks, forwarded className, and `bg-${dotsColor}`.
				files: [
					'src/components/site/global/input/PasswordChecker.tsx',
					'src/components/site/global/input/AvatarInput.tsx',
					'src/components/site/global/input/PasswordInput.tsx',
					'src/components/site/global/input/SubmitButton.tsx',
					'src/components/site/global/input/ReturnInfo.astro',
					'src/components/site/global/CardWrapper.astro',
					'src/components/site/global/Loader.astro',
				],
				rules: {
					'shadcn/require-static-classes': 'off',
				},
			},
			{
				// Progress scaleX transform and Motion.js color animation (not class-based).
				files: [
					'src/components/site/global/input/PasswordChecker.tsx',
					'src/components/site/global/input/SubmitButton.tsx',
				],
				rules: {
					'shadcn/no-inline-styles': 'off',
				},
			},
			{
				// One-off marketing/layout sizes that have no theme token yet.
				files: [
					'src/layouts/login.astro',
					'src/components/site/global/navigation/Navbar.astro',
					'src/components/site/global/CookieBanner.astro',
					'src/components/site/global/Loader.astro',
					'src/components/site/global/input/AvatarInput.tsx',
				],
				rules: {
					'shadcn/no-arbitrary-values': 'off',
				},
			},
			{
				// Astro scoped `<style>` blocks.
				files: [
					'src/components/site/global/CookieBanner.astro',
					'src/components/site/global/navigation/Navbar.astro',
					'src/components/site/global/navigation/MenuItem.astro',
					'src/layouts/login.astro',
					'src/pages/index.astro',
				],
				rules: {
					'shadcn/no-inline-styles': 'off',
				},
			},
			{
				// Danger-zone delete button restyles SubmitButton with red tokens.
				files: ['src/pages/dashboard/account.astro'],
				rules: {
					'shadcn/no-restyle': 'off',
				},
			},
			{
				// Stock Astro welcome SVG + placeholder classes.
				files: ['src/pages/index.astro'],
				rules: {
					'shadcn/no-unknown-classes': 'off',
					'shadcn/no-raw-colors': 'off',
					'shadcn/no-arbitrary-values': 'off',
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
		env: {
			COOKIE_SIGNING_SECRET: 'test-cookie-signing-secret',
		},
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
