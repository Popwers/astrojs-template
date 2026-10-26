/** Encodings the build writes next to each text asset (`file.br`, `file.gz`), in order of preference. */
export const CONTENT_ENCODINGS = ['br', 'gzip'] as const;

export type ContentEncoding = (typeof CONTENT_ENCODINGS)[number];

/** File suffix of each precompressed variant. */
export const ENCODING_SUFFIX = { br: '.br', gzip: '.gz' } as const satisfies Record<ContentEncoding, string>;

/**
 * Pick the precompressed variant to send for an `Accept-Encoding` header (RFC 9110 § 12.5.3).
 * @param acceptEncoding - The request header; missing means identity only.
 * @param available - The variants written for the file.
 * @returns The variant with the highest quality, `br` first on a tie, or `null` for the plain file.
 */
export function pickEncoding(
	acceptEncoding: string | null,
	available: readonly ContentEncoding[],
): ContentEncoding | null {
	if (!acceptEncoding) return null;
	const quality = new Map<string, number>();
	for (const part of acceptEncoding.split(',')) {
		const [rawToken = '', ...params] = part.toLowerCase().split(';');
		const token = rawToken.trim();
		if (!token) continue;
		const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
		quality.set(token, q ? Number.parseFloat(q.slice(2)) || 0 : 1);
	}
	const wildcard = quality.get('*') ?? 0;
	let best: ContentEncoding | null = null;
	let bestQuality = 0;
	for (const encoding of CONTENT_ENCODINGS) {
		if (!available.includes(encoding)) continue;
		const q =
			quality.get(encoding) ?? (encoding === 'gzip' ? quality.get('x-gzip') : undefined) ?? wildcard;
		if (q > bestQuality) {
			best = encoding;
			bestQuality = q;
		}
	}
	return best;
}
