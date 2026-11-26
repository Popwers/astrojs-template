import {
	assertUserRateLimit,
	MAX_TRACKED_CLIENTS,
	resetRateLimiter,
	SWEEP_INTERVAL_MS,
	trackedClientCount,
} from '@lib/rateLimit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const WINDOW_MS = 10 * 60_000;

function fillToCap(): void {
	for (let id = 0; id < MAX_TRACKED_CLIENTS; id += 1) {
		assertUserRateLimit(id, 'cap', 5, WINDOW_MS);
	}
}

beforeEach(() => {
	resetRateLimiter();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
	resetRateLimiter();
	vi.useRealTimers();
});

function attempt(userId: number, key = 'cap', max = 5): boolean {
	try {
		assertUserRateLimit(userId, key, max, WINDOW_MS);
		return true;
	} catch {
		return false;
	}
}

describe('rate limiter state bound', () => {
	it('never tracks more clients than the cap, however many distinct keys arrive', () => {
		fillToCap();
		for (let id = MAX_TRACKED_CLIENTS; id < MAX_TRACKED_CLIENTS + 500; id += 1) attempt(id);

		expect(trackedClientCount()).toBe(MAX_TRACKED_CLIENTS);
	});

	it('walks the tracked clients at most once per sweep interval, not once per new key', () => {
		fillToCap();
		attempt(99_999);
		const iterate = vi.spyOn(Map.prototype, Symbol.iterator);

		for (let id = 100_000; id < 100_200; id += 1) attempt(id);
		expect(iterate).not.toHaveBeenCalled();

		vi.advanceTimersByTime(SWEEP_INTERVAL_MS + 1);
		attempt(200_000);
		attempt(200_001);
		expect(iterate.mock.calls.length).toBeLessThanOrEqual(1);
	});

	it('still limits a key past its budget once the cap is reached', () => {
		fillToCap();
		const key = 0;
		for (let hit = 0; hit < 4; hit += 1) attempt(key);

		expect(attempt(key)).toBe(false);
	});

	it('keeps a refused key refused after more than the cap of new keys arrive', () => {
		for (let hit = 0; hit < 6; hit += 1) attempt(777_777, 'flood');
		expect(attempt(777_777, 'flood')).toBe(false);
		for (let id = 0; id < MAX_TRACKED_CLIENTS + 1_000; id += 1) attempt(id, 'flood');

		expect(attempt(777_777, 'flood')).toBe(false);
		expect(trackedClientCount()).toBeLessThanOrEqual(MAX_TRACKED_CLIENTS);
	});

	it('limits new keys together through one overflow bucket while the table is full of live buckets', () => {
		fillToCap();
		const results = Array.from({ length: 20 }, (_, index) => attempt(500_000 + index));

		expect(results.filter(Boolean)).toHaveLength(5);
		expect(trackedClientCount()).toBe(MAX_TRACKED_CLIENTS);
	});

	it('reclaims expired buckets and resumes per-key limiting', () => {
		fillToCap();
		attempt(500_000);
		vi.advanceTimersByTime(WINDOW_MS + SWEEP_INTERVAL_MS);

		for (let hit = 0; hit < 5; hit += 1) expect(attempt(600_000)).toBe(true);
		expect(attempt(600_000)).toBe(false);
		expect(attempt(600_001)).toBe(true);
		expect(trackedClientCount()).toBeLessThan(MAX_TRACKED_CLIENTS);
	});
});
