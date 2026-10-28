/** Traces rate when `SENTRY_TRACES_SAMPLE_RATE` is unset or invalid: the org quota is shared, keep it light. */
export const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

/**
 * Parse `SENTRY_TRACES_SAMPLE_RATE`. Anything that is not a number in [0, 1] falls back to the default
 * rather than clamping, so a typo never turns tracing up to 100 %.
 * @param raw - Variable value (`__SENTRY_TRACES_SAMPLE_RATE__`, inlined at build).
 * @returns The traces rate.
 */
export function parseTracesSampleRate(raw: string | undefined): number {
	const trimmed = raw?.trim() ?? '';
	if (trimmed === '') return DEFAULT_TRACES_SAMPLE_RATE;
	const rate = Number(trimmed);
	if (!Number.isFinite(rate) || rate < 0 || rate > 1) return DEFAULT_TRACES_SAMPLE_RATE;
	return rate;
}

interface SamplingContext {
	name: string;
	parentSampled?: boolean;
}

/**
 * A `tracesSampler`: health checks never, a parent's decision inherited, every other trace at `rate`.
 * @param rate - Rate from {@link parseTracesSampleRate}.
 * @returns The sampler.
 */
export function createTracesSampler(rate: number): (context: SamplingContext) => number | boolean {
	return ({ name, parentSampled }) => {
		if (name.includes('health')) return 0;
		if (parentSampled !== undefined) return parentSampled;
		return rate;
	};
}
