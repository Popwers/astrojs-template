import { describe, expect, it } from 'vitest';

import {
	createTracesSampler,
	DEFAULT_TRACES_SAMPLE_RATE,
	parseTracesSampleRate,
} from '../../src/lib/sentrySampling';

// Failure modes: unset or blank variable, non-numeric value, out-of-range value (a typo like `10`
// must not mean 100 %), a valid 0 swallowed as falsy, whitespace from an env file; the sampler
// tracing health checks, overriding a parent's decision, or ignoring the configured rate.
describe('parseTracesSampleRate', () => {
	it('defaults to 0.1 when unset or blank', () => {
		expect(DEFAULT_TRACES_SAMPLE_RATE).toBe(0.1);
		for (const raw of [undefined, '', '   ']) {
			expect(parseTracesSampleRate(raw)).toBe(0.1);
		}
	});

	it('reads a rate in [0, 1], trimmed', () => {
		expect(parseTracesSampleRate('0.05')).toBe(0.05);
		expect(parseTracesSampleRate(' 0.2 ')).toBe(0.2);
		expect(parseTracesSampleRate('1')).toBe(1);
	});

	it('keeps 0, which turns tracing off', () => {
		expect(parseTracesSampleRate('0')).toBe(0);
	});

	it('falls back to the default on a non-number or an out-of-range value', () => {
		for (const raw of ['abc', '0.1abc', 'NaN', 'Infinity', '-0.1', '1.5', '10']) {
			expect(parseTracesSampleRate(raw)).toBe(0.1);
		}
	});
});

describe('createTracesSampler', () => {
	const sampler = createTracesSampler(0.05);

	it('never traces health checks, even under a sampled parent', () => {
		expect(sampler({ name: 'GET /api/health' })).toBe(0);
		expect(sampler({ name: 'GET /api/health', parentSampled: true })).toBe(0);
	});

	it("inherits the parent's decision", () => {
		expect(sampler({ name: 'GET /', parentSampled: true })).toBe(true);
		expect(sampler({ name: 'GET /', parentSampled: false })).toBe(false);
	});

	it('samples other traces at the configured rate', () => {
		expect(sampler({ name: 'GET /dashboard' })).toBe(0.05);
	});
});
