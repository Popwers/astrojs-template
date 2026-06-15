import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import playformCompress from '@playform/compress';
import sentry from '@sentry/astro';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
	server: {
		host: true,
	},
	output: 'server',
	adapter: node({
		mode: 'standalone',
	}),
	site: 'https://your-project.fr',
	// Opt into the experimental Rust-based `.astro` compiler (replaces the Go
	// implementation): faster builds and stronger diagnostics. Requires the
	// `@astrojs/compiler-rs` package, which is a runtime dependency so the
	// Docker build stage (installed with `--no-dev`) can resolve it.
	experimental: {
		rustCompiler: true,
	},
	integrations: [
		react(),
		sitemap(),
		playformCompress({ HTML: false }),
		sentry({
			sourceMapsUploadOptions: {
				org: 'your-org',
				project: 'your-project',
				authToken: process.env.SENTRY_AUTH_TOKEN,
			},
		}),
		AstroPWA({
			manifest: false,
			registerType: 'autoUpdate',
			injectRegister: null,
			includeAssets: ['favicon.png', 'icon.png'],
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.ts',
			workbox: {
				navigateFallback: '/',
				globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}'],
				navigateFallbackAllowlist: [/^\/$/],
				runtimeCaching: [
					{
						urlPattern: ({ url, sameOrigin, request }) =>
							sameOrigin && request.mode === 'navigate' && !url.pathname.match(/^\/$/),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'offline-ssr-pages-cache',
							/* check the options in the workbox-build docs */
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
									// This callback will be called when the fetch call fails.
									// Beware of the logic, will be also invoked if the server is down.
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
	],
	prefetch: {
		prefetchAll: true,
	},
	cacheDir: './buildCache',
	env: {
		schema: {
			STRAPI_URL: envField.string({
				context: 'server',
				access: 'secret',
				default: 'https://api.your-project.fr',
			}),
			STRAPI_TOKEN: envField.string({
				context: 'server',
				access: 'secret',
				default: 'replace-me-with-a-strapi-api-token',
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
