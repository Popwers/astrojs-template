import { describe, expect, it } from 'vitest';

import { pickEncoding } from '../../server/encoding.ts';

// How negotiation can fail: a variant the client refused (q=0) or never listed is sent, the weaker
// encoding wins a tie or beats a higher quality, an unwritten variant is chosen, or header noise
// (case, spaces, aliases, wildcard) is misread.
const both = ['br', 'gzip'] as const;

describe('pickEncoding', () => {
	it('sends the plain file without an Accept-Encoding header', () => {
		expect(pickEncoding(null, both)).toBeNull();
		expect(pickEncoding('', both)).toBeNull();
		expect(pickEncoding('identity', both)).toBeNull();
	});

	it('prefers brotli on a tie and follows the client otherwise', () => {
		expect(pickEncoding('gzip, deflate, br, zstd', both)).toBe('br');
		expect(pickEncoding('gzip', both)).toBe('gzip');
		expect(pickEncoding('gzip;q=1, br;q=0.5', both)).toBe('gzip');
	});

	it('never sends a refused encoding', () => {
		expect(pickEncoding('br;q=0, gzip', both)).toBe('gzip');
		expect(pickEncoding('br;q=0, gzip;q=0', both)).toBeNull();
		expect(pickEncoding('*;q=0', both)).toBeNull();
	});

	it('only picks a variant that was written', () => {
		expect(pickEncoding('br', ['gzip'])).toBeNull();
		expect(pickEncoding('br, gzip', ['gzip'])).toBe('gzip');
		expect(pickEncoding('br, gzip', [])).toBeNull();
	});

	it('reads wildcards, aliases, case and spacing', () => {
		expect(pickEncoding('*', both)).toBe('br');
		expect(pickEncoding('br;q=0, *', both)).toBe('gzip');
		expect(pickEncoding('x-gzip', both)).toBe('gzip');
		expect(pickEncoding(' GZIP ; q=0.8 ', both)).toBe('gzip');
	});
});
