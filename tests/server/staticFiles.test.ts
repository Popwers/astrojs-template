import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
	IMMUTABLE_CACHE_CONTROL,
	PRIVATE_CACHE_CONTROL,
	PUBLIC_PAGE_CACHE_CONTROL,
	REVALIDATE_CACHE_CONTROL,
} from '../../server/cacheControl.ts';
import { indexStaticFiles } from '../../server/staticFiles.ts';

// How the index can fail: a page misses its slash-less URL (served without the page policy), a hashed
// asset loses `immutable`, a prerendered error page becomes edge-cacheable, a variant that was not
// written is listed, or files the server has nothing to add to are intercepted.
const dir = mkdtempSync(join(tmpdir(), 'static-files-'));
const write = (path: string, body = 'x') => {
	mkdirSync(join(dir, path, '..'), { recursive: true });
	writeFileSync(join(dir, path), body);
};
write('index.html');
write('index.html.br');
write('about/index.html');
write('404.html');
write('_astro/app.abc.js');
write('_astro/app.abc.js.br');
write('_astro/app.abc.js.gz');
write('_astro/small.abc.js');
write('sw.js');
write('sw.js.gz');
write('icon.png');
const files = indexStaticFiles(dir, '/_astro/');

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('indexStaticFiles', () => {
	it('serves pages on their slash-less path with the public page policy', () => {
		expect(files.get('/')?.cacheControl).toBe(PUBLIC_PAGE_CACHE_CONTROL);
		expect(files.get('/about')).toBe(files.get('/about/index.html'));
		expect(files.get('/about')?.cacheControl).toBe(PUBLIC_PAGE_CACHE_CONTROL);
	});

	it('keeps a prerendered error page out of shared caches', () => {
		expect(files.get('/404.html')?.cacheControl).toBe(PRIVATE_CACHE_CONTROL);
	});

	it('lists only the variants on disk and the right policy per file', () => {
		expect(Object.keys(files.get('/')?.variants ?? {})).toEqual(['br']);
		expect(Object.keys(files.get('/_astro/app.abc.js')?.variants ?? {})).toEqual(['br', 'gzip']);
		expect(files.get('/_astro/app.abc.js')?.cacheControl).toBe(IMMUTABLE_CACHE_CONTROL);
		expect(files.get('/sw.js')?.cacheControl).toBe(REVALIDATE_CACHE_CONTROL);
	});

	it('leaves files without a variant and binaries to the adapter', () => {
		expect(files.has('/_astro/small.abc.js')).toBe(false);
		expect(files.has('/icon.png')).toBe(false);
		expect(files.has('/index.html.br')).toBe(false);
	});
});
