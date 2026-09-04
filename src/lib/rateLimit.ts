interface RateLimitContext {
	request: {
		headers: {
			get(name: string): string | null;
		};
	};
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(context: RateLimitContext): string {
	return (
		context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		context.request.headers.get('x-real-ip') ??
		'unknown'
	);
}

/**
 * Best-effort in-process rate limiter for auth endpoints (single-instance).
 */
export function assertRateLimit(context: RateLimitContext, key: string, max: number, windowMs: number): void {
	const bucketKey = `${key}:${clientIp(context)}`;
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
