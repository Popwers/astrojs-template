import { fileURLToPath } from 'node:url';

import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import playformCompress from '@playform/compress';
import sentry from '@sentry/astro';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';
import { defineConfig, envField } from 'astro/config';

import { ACTION_BODY_SIZE_LIMIT } from './src/data/userOptions.ts';
import precompress from './src/integrations/precompress.ts';

/** Deployed commit SHA (Dockerfile maps SOURCE_COMMIT to SENTRY_RELEASE). */
const sentryRelease = process.env.SENTRY_RELEASE || undefined;

const STRAPI_URL_DEFAULT = 'https://api.your-project.fr';

/** Client half of the build (`build.client`), where the Node adapter serves static files from. */
const clientDir = fileURLToPath(new URL('./dist/client/', import.meta.url));

export default defineConfig({
	server: {
		host: true,
	},
	// Static by default: every page is prerendered at build unless it exports `prerender = false`
	// (forms, session, auth guards). The Node adapter serves those on-demand routes, the actions and
	// the server islands, and hands the prerendered HTML and assets to its static handler.
	output: 'static',
	adapter: node({
		mode: 'standalone',
	}),
	site: 'https://your-project.fr',
	// Prerendered pages get the same slash-less URL as the on-demand ones (canonical, sitemap):
	// `normalizePath` and the static handler redirect `/page/` to `/page`.
	trailingSlash: 'never',
	// Astro caps Action request bodies at 1 MB by default, which would reject any avatar over
	// that limit. The ceiling is derived from MAX_FILE_SIZE in userOptions.ts — the single source
	// of truth — so there is one place to change the limit.
	security: {
		actionBodySizeLimit: ACTION_BODY_SIZE_LIMIT,
	},
	integrations: [
		react(),
		sitemap(),
		// CSS: false — csso silently drops every `@media (width >= …)` range-syntax block
		// emitted by Tailwind 4 (kept as-is since Vite 8/Astro 7), wiping all responsive
		// styles in production. Vite already minifies CSS, so csso only added ~1% anyway.
		playformCompress({ HTML: false, CSS: false }),
		sentry({
			org: 'your-org',
			project: 'your-project',
			authToken: process.env.SENTRY_AUTH_TOKEN,
			release: {
				name: sentryRelease,
				deploy: sentryRelease ? { env: 'production' } : false,
			},
			// Release or deploy upload failures must not break the Docker build.
			errorHandler: (error) => console.warn(`[sentry] ${error.message}`),
		}),
		AstroPWA({
			manifest: false,
			registerType: 'autoUpdate',
			injectRegister: null,
			includeAssets: ['favicon.png', 'icon.png'],
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.ts',
			// @vite-pwa/astro targets build.client only for output 'server'; with 'static' + adapter it
			// would write the worker and glob the precache in dist/server.
			outDir: clientDir,
			// The upload helpers (HEIC decoder, image compression) load on demand in the dashboard;
			// precaching them would make every first visit download 1.4 MB more.
			injectManifest: {
				globDirectory: clientDir,
				globIgnores: ['**/vendor-heic2any.*', '**/vendor-browser-image-compression.*'],
			},
			workbox: {
				navigateFallback: '/',
				globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
				navigateFallbackAllowlist: [/^\/$/],
				runtimeCaching: [
					{
						urlPattern: ({ url, sameOrigin, request }) =>
							sameOrigin && request.mode === 'navigate' && !url.pathname.match(/^\/$/),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'offline-ssr-pages-cache',
							matchOptions: {
								ignoreVary: true,
								ignoreSearch: true,
							},
							cacheableResponse: {
								statuses: [200],
							},
							expiration: {
								maxEntries: 100,
							},
							plugins: [
								{
									cachedResponseWillBeUsed: async (params) => {
										// When handlerDidError is invoked, then we can prevent redirecting if there is an entry in the cache.
										// To check the behavior, navigate to a page, then disable the network and refresh the page.

										params.state ??= {};
										params.state.dontRedirect = params.cachedResponse;
									},
									handlerDidError: async ({ state }) => {
										// Offline fallback: when `cachedResponseWillBeUsed` captured a
										// cached Response, serve it instead of letting the failure bubble.
										if (state?.dontRedirect) return state.dontRedirect;
										// No cache to fall back to — defer to workbox's `navigateFallback`.
										return undefined;
									},
								},
							],
						},
					},
				],
			},
			devOptions: {
				enabled: false,
				type: 'module',
				navigateFallbackAllowlist: [/^\/$/],
			},
		}),
		// Last: writes .br/.gz next to the final files (after the minifier and the service worker).
		precompress(),
	],
	// Every link prefetches on hover/focus; the main nav (`data-astro-prefetch='viewport'`) as soon as
	// it is visible. A prefetched page then costs no round trip to Hetzner.
	prefetch: {
		prefetchAll: true,
		defaultStrategy: 'hover',
	},
	// Astro defaults, stated so a project does not lose them by accident: minified HTML, and
	// stylesheets under 4 kB inlined in <head> (no extra request), larger ones linked and cached.
	compressHTML: true,
	build: {
		inlineStylesheets: 'auto',
	},
	cacheDir: './buildCache',
	env: {
		schema: {
			STRAPI_URL: envField.string({
				context: 'server',
				access: 'secret',
				default: STRAPI_URL_DEFAULT,
			}),
			STRAPI_TOKEN: envField.string({
				context: 'server',
				access: 'secret',
				default: 'replace-me-with-a-strapi-api-token',
			}),
			COOKIE_SIGNING_SECRET: envField.string({
				context: 'server',
				access: 'secret',
			}),
			// The site key is public, but `secret` makes astro:env read it at runtime instead of
			// inlining it at build, so one Docker image serves every environment.
			TURNSTILE_SITE_KEY: envField.string({
				context: 'server',
				access: 'secret',
			}),
			TURNSTILE_SECRET_KEY: envField.string({
				context: 'server',
				access: 'secret',
			}),
		},
	},
	image: {
		domains: import.meta.env.DEV ? undefined : ['api.your-project.fr'],
		remotePatterns: import.meta.env.DEV
			? undefined
			: [
					{
						protocol: 'https',
						hostname: 'api.your-project.fr',
					},
				],
	},
	vite: {
		plugins: [tailwindcss()],
		// STRAPI_URL is server-only; the browser Sentry filter needs the CMS origin it reports on.
		define: { __STRAPI_URL__: JSON.stringify(process.env.STRAPI_URL || STRAPI_URL_DEFAULT) },
		// Modern output target: skip legacy transpilation/polyfills for smaller, faster bundles.
		build: {
			target: 'esnext',
			modulePreload: {
				polyfill: false,
			},
			rollupOptions: {
				output: {
					// Per-package vendor chunks for independent cache invalidation. Astro's own
					// framework packages stay in the default chunk: splitting them breaks the
					// astro:env runtime init order (TDZ on _getEnv/setGetEnv).
					manualChunks(id) {
						if (!id.includes('node_modules')) return;
						if (id.includes('/node_modules/astro/') || id.includes('/node_modules/@astrojs/'))
							return;
						const pkg = id.split('node_modules/')[1]?.split('/')[0];
						if (pkg) {
							return `vendor-${pkg.replace('@', '').replace('/', '-')}`;
						}
					},
				},
			},
		},
		// Force a single React copy and pre-bundle every React-island dependency up front.
		// Without this, Vite discovers island deps lazily on first navigation, re-optimizes
		// mid-session, and any already-open tab mixes two React generations — surfacing as
		// "Invalid hook call" / "useRef of null" until a hard refresh.
		resolve: {
			dedupe: ['react', 'react-dom'],
		},
		optimizeDeps: {
			include: [
				'react',
				'react-dom',
				'react-dom/client',
				'react/jsx-runtime',
				'react/jsx-dev-runtime',
				'motion/react',
				'@legendapp/state/react',
			],
		},
	},
});
