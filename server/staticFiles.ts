import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import {
	IMMUTABLE_CACHE_CONTROL,
	PRIVATE_CACHE_CONTROL,
	PUBLIC_PAGE_CACHE_CONTROL,
	REVALIDATE_CACHE_CONTROL,
} from './cacheControl.ts';
import { CONTENT_ENCODINGS, ENCODING_SUFFIX, type ContentEncoding } from './encoding.ts';

/** One precompressed copy of a file. */
export interface FileVariant {
	path: string;
	size: number;
	mtimeMs: number;
}

/** A file of `dist/client` the production server answers for itself or decorates before the adapter. */
export interface StaticFile {
	contentType: string;
	cacheControl: string;
	/** Precompressed copies written by the `precompress` integration. */
	variants: Partial<Record<ContentEncoding, FileVariant>>;
}

/** Content types of the extensions the build precompresses. */
const CONTENT_TYPES = new Map<string, string>([
	['.html', 'text/html; charset=utf-8'],
	['.js', 'text/javascript; charset=utf-8'],
	['.mjs', 'text/javascript; charset=utf-8'],
	['.css', 'text/css; charset=utf-8'],
	['.svg', 'image/svg+xml'],
	['.json', 'application/json'],
	['.xml', 'application/xml'],
	['.txt', 'text/plain; charset=utf-8'],
	['.webmanifest', 'application/manifest+json'],
]);

/** Extensions the `precompress` integration writes `.br`/`.gz` copies for. */
export const COMPRESSIBLE_EXTENSIONS: ReadonlySet<string> = new Set(CONTENT_TYPES.keys());

/** Prerendered error pages keep their status semantics: never stored by a shared cache. */
const ERROR_PAGES = new Set(['/404.html', '/500.html']);

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

function cacheControlFor(urlPath: string, assetsPrefix: string): string {
	if (urlPath.startsWith(assetsPrefix)) return IMMUTABLE_CACHE_CONTROL;
	if (ERROR_PAGES.has(urlPath)) return PRIVATE_CACHE_CONTROL;
	if (urlPath.endsWith('.html')) return PUBLIC_PAGE_CACHE_CONTROL;
	return REVALIDATE_CACHE_CONTROL;
}

/**
 * Index the files of the client build the server must handle: prerendered HTML (to give it the public
 * page policy) and every file with a precompressed variant. Read once at boot; the build is immutable.
 * @param clientDir - Absolute path of `dist/client`.
 * @param assetsPrefix - URL prefix of the hashed assets, `/_astro/`.
 * @returns URL pathname to file; a directory page answers on its slash-less path (`/about`).
 */
export function indexStaticFiles(clientDir: string, assetsPrefix: string): Map<string, StaticFile> {
	const files = new Map<string, StaticFile>();
	const onDisk = new Set(walk(clientDir));
	for (const path of onDisk) {
		const extension = extname(path);
		const contentType = CONTENT_TYPES.get(extension);
		if (!contentType) continue;
		const variants: StaticFile['variants'] = {};
		for (const encoding of CONTENT_ENCODINGS) {
			const variantPath = path + ENCODING_SUFFIX[encoding];
			if (!onDisk.has(variantPath)) continue;
			const { size, mtimeMs } = statSync(variantPath);
			variants[encoding] = { path: variantPath, size, mtimeMs };
		}
		if (extension !== '.html' && Object.keys(variants).length === 0) continue;
		const urlPath = `/${relative(clientDir, path).split(sep).join('/')}`;
		const file: StaticFile = {
			contentType,
			cacheControl: cacheControlFor(urlPath, assetsPrefix),
			variants,
		};
		files.set(urlPath, file);
		if (urlPath.endsWith('/index.html')) {
			files.set(urlPath.slice(0, -'/index.html'.length) || '/', file);
		}
	}
	return files;
}
