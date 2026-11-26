import { clientIp } from '@lib/clientIp';
import type { ClientContext } from '@lib/clientIp';
import { ActionError } from 'astro:actions';

interface Bucket {
	count: number;
	resetAt: number;
}

/**
 * Most clients tracked at once. A live counter is never evicted, or flooding new keys would erase a
 * throttled client's budget: when the table is full of live buckets, new clients share one overflow
 * budget per route instead.
 */
export const MAX_TRACKED_CLIENTS = 10_000;

/** Expired buckets are swept at most this often, never on every request. */
export const SWEEP_INTERVAL_MS = 60_000;

/** Expired buckets reclaimed from the front of the table per request. */
const FRONT_RECLAIM_STEPS = 8;

let lastSweepAt = 0;

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
	lastSweepAt = now;
	for (const [key, bucket] of buckets) {
		if (now >= bucket.resetAt) buckets.delete(key);
	}
}

/** Shared budget of the clients that arrive while the table is full, one per limited route. */
const overflowBuckets = new Map<string, Bucket>();

function bump(bucket: Bucket, max: number): void {
	bucket.count += 1;
	if (bucket.count > max) {
		throw new ActionError({
			code: 'TOO_MANY_REQUESTS',
			message: 'Trop de tentatives. Veuillez réessayer plus tard.',
		});
	}
}

/** Drops the expired buckets at the front of the table: a few per request, never the whole list. */
function dropExpiredFront(now: number): void {
	for (let step = 0; step < FRONT_RECLAIM_STEPS; step += 1) {
		const first = buckets.entries().next();
		if (first.done || now < first.value[1].resetAt) return;
		buckets.delete(first.value[0]);
	}
}

function consumeOverflow(route: string, max: number, windowMs: number, now: number): void {
	const current = overflowBuckets.get(route);
	if (!current || now >= current.resetAt) {
		overflowBuckets.set(route, { count: 1, resetAt: now + windowMs });
		return;
	}

	bump(current, max);
}

function consume(route: string, subject: string, max: number, windowMs: number): void {
	const bucketKey = `${route}:${subject}`;
	const now = Date.now();
	const bucket = buckets.get(bucketKey);

	if (bucket && now < bucket.resetAt) {
		bump(bucket, max);
		return;
	}

	buckets.delete(bucketKey);
	if (buckets.size >= MAX_TRACKED_CLIENTS) {
		dropExpiredFront(now);
		if (buckets.size >= MAX_TRACKED_CLIENTS && now - lastSweepAt >= SWEEP_INTERVAL_MS)
			dropExpiredBuckets(now);
	}
	if (buckets.size >= MAX_TRACKED_CLIENTS) {
		consumeOverflow(route, max, windowMs, now);
		return;
	}

	buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
}

/**
 * Best-effort in-process rate limiter for auth endpoints (single-instance).
 * @throws ActionError `TOO_MANY_REQUESTS` (HTTP 429) once `max` calls land inside `windowMs`.
 */
export function assertRateLimit(context: ClientContext, key: string, max: number, windowMs: number): void {
	consume(key, clientSubject(clientIp(context)), max, windowMs);
}

/**
 * The same limiter for a signed-in user, counted per account so that a shared address does not pool
 * several users and a rotating address does not reset one.
 * @throws ActionError `TOO_MANY_REQUESTS` (HTTP 429) once `max` calls land inside `windowMs`.
 */
export function assertUserRateLimit(userId: number, key: string, max: number, windowMs: number): void {
	consume(key, `user:${userId}`, max, windowMs);
}

/** Number of clients the limiter currently tracks. */
export function trackedClientCount(): number {
	return buckets.size;
}

/** Forgets every counter, for tests that fill the table. */
export function resetRateLimiter(): void {
	buckets.clear();
	overflowBuckets.clear();
	lastSweepAt = 0;
}
