import { clientIp } from '@lib/clientIp';
import type { ClientContext } from '@lib/clientIp';

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Best-effort in-process rate limiter for auth endpoints (single-instance).
 */
export function assertRateLimit(context: ClientContext, key: string, max: number, windowMs: number): void {
	const bucketKey = `${key}:${clientIp(context) ?? 'unknown'}`;
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
