import { clientIp } from '@lib/clientIp';
import type { ClientContext } from '@lib/clientIp';
import { ActionError } from 'astro:actions';

interface Bucket {
	count: number;
	resetAt: number;
}

/** Above this many tracked clients, a new client first sweeps the expired buckets. */
const SWEEP_THRESHOLD = 10_000;

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

const buckets = new Map<string, Bucket>();

/**
 * The part of an IPv6 address one subscriber controls: the first 64 bits. Rotating the last 64 bits
 * must not hand an attacker a fresh budget per address. IPv4 and IPv4-mapped addresses are kept whole.
 */
function clientSubject(ip: string | null): string {
	if (ip === null) return 'unknown';

	const mapped = IPV4_MAPPED.exec(ip);
	if (mapped?.[1]) return mapped[1];
	if (!ip.includes(':') || ip.includes('.')) return ip;

	const [head = '', tail] = ip.split('::');
	const headGroups = head === '' ? [] : head.split(':');
	const tailGroups = tail === undefined || tail === '' ? [] : tail.split(':');
	const fill =
		tail === undefined
			? []
			: Array<string>(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill('0');
	return [...headGroups, ...fill, ...tailGroups]
		.slice(0, 4)
		.map((group) => group.toLowerCase().padStart(4, '0'))
		.join(':');
}

function dropExpiredBuckets(now: number): void {
	for (const [key, bucket] of buckets) {
		if (now >= bucket.resetAt) buckets.delete(key);
	}
}

function consume(bucketKey: string, max: number, windowMs: number): void {
	const now = Date.now();
	const bucket = buckets.get(bucketKey);

	if (!bucket || now >= bucket.resetAt) {
		if (buckets.size >= SWEEP_THRESHOLD) dropExpiredBuckets(now);
		buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
		return;
	}

	bucket.count += 1;
	if (bucket.count > max) {
		throw new ActionError({
			code: 'TOO_MANY_REQUESTS',
			message: 'Trop de tentatives. Veuillez réessayer plus tard.',
		});
	}
}

/**
 * Best-effort in-process rate limiter for auth endpoints (single-instance).
 * @throws ActionError `TOO_MANY_REQUESTS` (HTTP 429) once `max` calls land inside `windowMs`.
 */
export function assertRateLimit(context: ClientContext, key: string, max: number, windowMs: number): void {
	consume(`${key}:${clientSubject(clientIp(context))}`, max, windowMs);
}

/**
 * The same limiter for a signed-in user, counted per account so that a shared address does not pool
 * several users and a rotating address does not reset one.
 * @throws ActionError `TOO_MANY_REQUESTS` (HTTP 429) once `max` calls land inside `windowMs`.
 */
export function assertUserRateLimit(userId: number, key: string, max: number, windowMs: number): void {
	consume(`${key}:user:${userId}`, max, windowMs);
}
