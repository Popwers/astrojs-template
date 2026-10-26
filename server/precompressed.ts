import { createReadStream } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { CONTENT_ENCODINGS, pickEncoding } from './encoding.ts';
import type { StaticFile } from './staticFiles.ts';

/** A Node request listener: the Astro adapter's handler, or one wrapping it. */
export type Listener = (req: IncomingMessage, res: ServerResponse) => void;

function requestPathname(url: string | undefined): string | null {
	if (!url) return null;
	try {
		return decodeURI(new URL(url, 'http://localhost').pathname);
	} catch {
		// Malformed URL: the adapter answers it (400).
		return null;
	}
}

/**
 * Answer `GET`/`HEAD` for an indexed file with its precompressed variant when the client accepts one,
 * and give every indexed file its `Cache-Control` and `Vary`. Everything else, and the plain copy of an
 * indexed file, goes to `next` (the adapter's static handler then Astro), which keeps those headers.
 * @param files - Index from `indexStaticFiles`.
 * @param next - The adapter's request handler.
 * @returns The wrapped listener.
 */
export function servePrecompressed(files: ReadonlyMap<string, StaticFile>, next: Listener): Listener {
	return (req, res) => {
		const isRead = req.method === 'GET' || req.method === 'HEAD';
		const pathname = isRead ? requestPathname(req.url) : null;
		const file = pathname === null ? undefined : files.get(pathname);
		if (!file) {
			next(req, res);
			return;
		}
		res.setHeader('Cache-Control', file.cacheControl);
		const available = CONTENT_ENCODINGS.filter((encoding) => file.variants[encoding]);
		if (available.length > 0) res.setHeader('Vary', 'Accept-Encoding');
		const encoding = pickEncoding(req.headers['accept-encoding'] ?? null, available);
		const variant = encoding ? file.variants[encoding] : undefined;
		if (!encoding || !variant) {
			next(req, res);
			return;
		}
		const etag = `W/"${variant.size.toString(16)}-${Math.trunc(variant.mtimeMs).toString(16)}-${encoding}"`;
		res.setHeader('ETag', etag);
		if (req.headers['if-none-match'] === etag) {
			res.statusCode = 304;
			res.end();
			return;
		}
		res.setHeader('Content-Type', file.contentType);
		res.setHeader('Content-Encoding', encoding);
		res.setHeader('Content-Length', variant.size);
		if (req.method === 'HEAD') {
			res.end();
			return;
		}
		createReadStream(variant.path)
			.on('error', () => res.destroy())
			.pipe(res);
	};
}
