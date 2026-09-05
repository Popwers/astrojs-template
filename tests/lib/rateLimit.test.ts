import { afterEach, describe, expect, it } from 'bun:test';

import { assertRateLimit } from '@lib/rateLimit';

interface RateLimitContext {
	request: {
		headers: {
			get(name: string): string | null;
		};
	};
	clientAddress?: string;
}

function contextWith(headers: Record<string, string>, clientAddress?: string): RateLimitContext {
	const normalised: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers)) {
		normalised[name.toLowerCase()] = value;
	}

	return {
		request: {
			headers: {
				get(name: string): string | null {
					return normalised[name.toLowerCase()] ?? null;
				},
			},
		},
		clientAddress,
	};
}

function withTrustProxy(value: string | undefined, run: () => void): void {
	const previous = process.env.TRUST_PROXY;
	if (value === undefined) {
		delete process.env.TRUST_PROXY;
	} else {
		process.env.TRUST_PROXY = value;
	}

	try {
		run();
	} finally {
		if (previous === undefined) {
			delete process.env.TRUST_PROXY;
		} else {
			process.env.TRUST_PROXY = previous;
		}
	}
}

describe('assertRateLimit client identity', () => {
	afterEach(() => {
		delete process.env.TRUST_PROXY;
	});

	it('ignores spoofed X-Forwarded-For when TRUST_PROXY is unset', () => {
		withTrustProxy(undefined, () => {
			const socket = '203.0.113.10';
			assertRateLimit(contextWith({ 'x-forwarded-for': '198.51.100.1' }, socket), 'xff-none', 2, 60_000);
			assertRateLimit(contextWith({ 'x-forwarded-for': '198.51.100.2' }, socket), 'xff-none', 2, 60_000);
			expect(() =>
				assertRateLimit(contextWith({ 'x-forwarded-for': '198.51.100.3' }, socket), 'xff-none', 2, 60_000),
			).toThrow(/Too many attempts/);
		});
	});

	it('ignores spoofed X-Real-IP when TRUST_PROXY is unset', () => {
		withTrustProxy(undefined, () => {
			const socket = '203.0.113.11';
			assertRateLimit(contextWith({ 'x-real-ip': '198.51.100.8' }, socket), 'xreal-none', 1, 60_000);
			expect(() =>
				assertRateLimit(contextWith({ 'x-real-ip': '198.51.100.9' }, socket), 'xreal-none', 1, 60_000),
			).toThrow(/Too many attempts/);
		});
	});

	it('uses CF-Connecting-IP when TRUST_PROXY is cloudflare', () => {
		withTrustProxy('cloudflare', () => {
			assertRateLimit(
				contextWith({ 'cf-connecting-ip': '198.51.100.20', 'x-forwarded-for': '203.0.113.1' }, '10.0.0.1'),
				'cf-trust',
				1,
				60_000,
			);
			expect(() =>
				assertRateLimit(
					contextWith({ 'cf-connecting-ip': '198.51.100.20', 'x-forwarded-for': '203.0.113.2' }, '10.0.0.2'),
					'cf-trust',
					1,
					60_000,
				),
			).toThrow(/Too many attempts/);
			expect(() =>
				assertRateLimit(
					contextWith({ 'cf-connecting-ip': '198.51.100.21', 'x-forwarded-for': '203.0.113.1' }, '10.0.0.1'),
					'cf-trust',
					1,
					60_000,
				),
			).not.toThrow();
		});
	});

	it('uses the rightmost X-Forwarded-For hop when TRUST_PROXY is forwarded', () => {
		withTrustProxy('forwarded', () => {
			assertRateLimit(
				contextWith({ 'x-forwarded-for': '198.51.100.1, 203.0.113.40' }, '10.0.0.1'),
				'xff-trust',
				1,
				60_000,
			);
			expect(() =>
				assertRateLimit(
					contextWith({ 'x-forwarded-for': '198.51.100.9, 203.0.113.40' }, '10.0.0.9'),
					'xff-trust',
					1,
					60_000,
				),
			).toThrow(/Too many attempts/);
			expect(() =>
				assertRateLimit(
					contextWith({ 'x-forwarded-for': '198.51.100.1, 203.0.113.41' }, '10.0.0.1'),
					'xff-trust',
					1,
					60_000,
				),
			).not.toThrow();
		});
	});

	it('falls back to the socket address when no trusted header is present', () => {
		withTrustProxy(undefined, () => {
			assertRateLimit(contextWith({}, '203.0.113.50'), 'socket-only', 1, 60_000);
			expect(() => assertRateLimit(contextWith({}, '203.0.113.50'), 'socket-only', 1, 60_000)).toThrow(
				/Too many attempts/,
			);
			expect(() => assertRateLimit(contextWith({}, '203.0.113.51'), 'socket-only', 1, 60_000)).not.toThrow();
		});
	});
});
