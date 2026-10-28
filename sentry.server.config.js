import { createTracesSampler, parseTracesSampleRate } from '@lib/sentrySampling';
import * as Sentry from '@sentry/astro';

import { dataCollection } from './sentry.data-collection.js';

// Build-time DSN (PUBLIC_SENTRY_DSN, inlined in client and server bundles). Empty keeps Sentry off.
const SENTRY_DSN = import.meta.env.PUBLIC_SENTRY_DSN;

// SENTRY_TRACES_SAMPLE_RATE at build time, default 0.1 (src/lib/sentrySampling.ts).
const tracesRate = parseTracesSampleRate(__SENTRY_TRACES_SAMPLE_RATE__);

// No `@sentry/profiling-node`: it is a native NAPI addon that calls `uv_default_loop`
// at init, which the Bun runtime (popwers/mini-bun) does not support (oven-sh/bun#18546)
// and crashes the server at startup. Error reporting + tracing work without it.
if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
	Sentry.init({
		environment: process.env.NODE_ENV,
		dsn: SENTRY_DSN,
		dataCollection,

		tracesSampler: createTracesSampler(tracesRate),
		tracesSampleRate: tracesRate,
	});
}
