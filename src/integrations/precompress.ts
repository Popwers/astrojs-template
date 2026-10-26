import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

import type { AstroIntegration } from 'astro';

// Text formats only: images, fonts and video are compressed already.
import { COMPRESSIBLE_EXTENSIONS } from '../../server/staticFiles.ts';

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

/** Below this size the encoding headers cost more than they save. */
const MIN_BYTES = 1024;

async function listFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { recursive: true, withFileTypes: true });
	return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

async function compressFile(path: string): Promise<{ raw: number; br: number }> {
	const source = await readFile(path);
	const [br, gz] = await Promise.all([
		brotli(source, {
			params: {
				[constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
				[constants.BROTLI_PARAM_SIZE_HINT]: source.length,
			},
		}),
		gzipAsync(source, { level: constants.Z_BEST_COMPRESSION }),
	]);
	// A variant that does not shrink the file is not written: the server then sends the plain copy.
	await Promise.all([
		br.length < source.length ? writeFile(`${path}.br`, br) : undefined,
		gz.length < source.length ? writeFile(`${path}.gz`, gz) : undefined,
	]);
	return { raw: source.length, br: Math.min(br.length, source.length) };
}

/**
 * Writes `file.br` (quality 11) and `file.gz` (level 9) next to every text file of the client build,
 * once, at build time. `server/start.ts` sends them to clients that accept them, so the Node process
 * never compresses on the fly. Keep it last in `integrations`: earlier hooks still rewrite files.
 * @returns The Astro integration.
 */
export default function precompress(): AstroIntegration {
	return {
		name: 'precompress',
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const files = (await listFiles(fileURLToPath(dir))).filter((path) =>
					COMPRESSIBLE_EXTENSIONS.has(extname(path)),
				);
				const results = await Promise.all(
					files.map(async (path) => {
						const { size } = await stat(path);
						return size >= MIN_BYTES ? compressFile(path) : undefined;
					}),
				);
				const done = results.filter((result) => result !== undefined);
				const raw = done.reduce((sum, result) => sum + result.raw, 0);
				const br = done.reduce((sum, result) => sum + result.br, 0);
				logger.info(
					`${done.length} files: ${(raw / 1024).toFixed(0)} KiB -> ${(br / 1024).toFixed(0)} KiB brotli`,
				);
			},
		},
	};
}
