import { withPwaAssetVersion } from '@lib/pwaAssets';
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
	const manifest = {
		$schema: 'https://json.schemastore.org/web-manifest-combined.json',
		short_name: 'Your Project',
		name: 'Your Project',
		description: 'Your project description',
		icons: [
			{
				src: withPwaAssetVersion('/favicon.png'),
				sizes: '48x48',
				type: 'image/png',
			},
			{
				src: withPwaAssetVersion('/favicon.png'),
				sizes: 'any',
				type: 'image/svg+xml',
			},
			{
				src: withPwaAssetVersion('/apple-touch-icon-180x180.png'),
				sizes: '180x180',
				type: 'image/png',
			},
			{
				src: withPwaAssetVersion('/pwa-64x64.png'),
				sizes: '64x64',
				type: 'image/png',
			},
			{
				src: withPwaAssetVersion('/pwa-192x192.png'),
				sizes: '192x192',
				type: 'image/png',
			},
			{
				src: withPwaAssetVersion('/pwa-512x512.png'),
				sizes: '512x512',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: withPwaAssetVersion('/maskable-icon-512x512.png'),
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable',
			},
		],
		start_url: '/dashboard',
		scope: '/',
		display: 'standalone',
		orientation: 'portrait',
		background_color: '#ffffff',
		theme_color: '#ffffff',
	};

	return new Response(JSON.stringify(manifest), {
		headers: {
			'Content-Type': 'application/manifest+json; charset=utf-8',
			'Cache-Control': 'public, max-age=0, must-revalidate',
		},
	});
};
