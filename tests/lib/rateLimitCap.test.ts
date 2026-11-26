import {
	assertUserRateLimit,
	MAX_TRACKED_CLIENTS,
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
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
	vi.useRealTimers();
});

describe('rate limiter state bound', () => {
	it('never tracks more clients than the cap, however many distinct keys arrive', () => {
		fillToCap();
		for (let id = MAX_TRACKED_CLIENTS; id < MAX_TRACKED_CLIENTS + 500; id += 1) {
			assertUserRateLimit(id, 'cap', 5, WINDOW_MS);
		}

		expect(trackedClientCount()).toBe(MAX_TRACKED_CLIENTS);
	});

	it('walks the tracked clients at most once per sweep interval, not once per new key', () => {
		fillToCap();
		assertUserRateLimit(99_999, 'cap', 5, WINDOW_MS);
		const iterate = vi.spyOn(Map.prototype, Symbol.iterator);

		for (let id = 100_000; id < 100_200; id += 1) {
			assertUserRateLimit(id, 'cap', 5, WINDOW_MS);
		}
		expect(iterate).not.toHaveBeenCalled();

		vi.advanceTimersByTime(SWEEP_INTERVAL_MS + 1);
		assertUserRateLimit(200_000, 'cap', 5, WINDOW_MS);
		assertUserRateLimit(200_001, 'cap', 5, WINDOW_MS);
		expect(iterate.mock.calls.length).toBeLessThanOrEqual(1);
	});

	it('still limits a key past its budget once the cap is reached', () => {
		fillToCap();
		const key = 999_999;
		for (let attempt = 0; attempt < 5; attempt += 1) assertUserRateLimit(key, 'cap', 5, WINDOW_MS);

		expect(() => assertUserRateLimit(key, 'cap', 5, WINDOW_MS)).toThrow(/Trop de tentatives/);
	});
});
