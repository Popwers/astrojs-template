import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import playformCompress from '@playform/compress';
//import sentry from '@sentry/astro';
//import spotlightjs from '@spotlightjs/astro';
import tailwindcss from '@tailwindcss/vite';
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
	integrations: [
		react(),
		sitemap(),
		playformCompress({ HTML: false }),
		/*sentry({
			sourceMapsUploadOptions: {
				project: 'your-project',
				authToken: process.env.SENTRY_AUTH_TOKEN,
			},
		}),
		spotlightjs(),*/
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
			STRAPI_TOKEN: envField.string({ context: 'server', access: 'secret' }),
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
	},
});
