interface HeaderReader {
	get(name: string): string | null;
}

interface RateLimitContext {
	request: {
		headers: HeaderReader;
	};
	clientAddress?: string;
}

type ProxyTrust = 'none' | 'cloudflare' | 'forwarded';

const buckets = new Map<string, { count: number; resetAt: number }>();

const IP_PATTERN = /^[0-9a-fA-F:.]+$/;

function parseProxyTrust(raw: string | undefined): ProxyTrust {
	if (raw === 'cloudflare' || raw === 'cf') {
		return 'cloudflare';
	}

	if (raw === '1' || raw === 'true' || raw === 'forwarded') {
		return 'forwarded';
	}

	return 'none';
}

function parseIp(raw: string | null | undefined): string | null {
	if (raw === undefined || raw === null || raw === '') {
		return null;
	}

	const trimmed = raw.trim();
	if (trimmed === '' || !IP_PATTERN.test(trimmed)) {
		return null;
	}

	if (!trimmed.includes('.') && !trimmed.includes(':')) {
		return null;
	}

	return trimmed;
}

function rightmostForwardedIp(xff: string | null): string | null {
	if (xff === null || xff === '') {
		return null;
	}

	const hops = xff.split(',');
	for (let index = hops.length - 1; index >= 0; index -= 1) {
		const ip = parseIp(hops[index]);
		if (ip) {
			return ip;
		}
	}

	return null;
}

function resolveClientIp(context: RateLimitContext, trust: ProxyTrust): string {
	switch (trust) {
		case 'cloudflare': {
			const cloudflareIp = parseIp(context.request.headers.get('cf-connecting-ip'));
			if (cloudflareIp) {
				return cloudflareIp;
			}
			break;
		}
		case 'forwarded': {
			const forwarded =
				rightmostForwardedIp(context.request.headers.get('x-forwarded-for')) ??
				parseIp(context.request.headers.get('x-real-ip'));
			if (forwarded) {
				return forwarded;
			}
			break;
		}
		case 'none':
			break;
		default: {
			const exhaustive: never = trust;
			return exhaustive;
		}
	}

	return parseIp(context.clientAddress) ?? 'unknown';
}

/**
 * Best-effort in-process rate limiter for auth endpoints (single-instance).
 */
export function assertRateLimit(context: RateLimitContext, key: string, max: number, windowMs: number): void {
	const bucketKey = `${key}:${resolveClientIp(context, parseProxyTrust(process.env.TRUST_PROXY))}`;
	const now = Date.now();
	const bucket = buckets.get(bucketKey);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
		return;
	}

	bucket.count += 1;
	if (bucket.count > max) {
		throw new Error('Too many attempts. Please try again later.');
	}
}
