import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import playformCompress from '@playform/compress'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
	site: 'https://mysite.fr',
	integrations: [react(), tailwind(), sitemap(), playformCompress()],
	prefetch: {
		prefetchAll: true,
	},
	cacheDir: './buildCache',
});
