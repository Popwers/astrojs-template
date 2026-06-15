import * as Sentry from '@sentry/astro';

// Set your project DSN here to enable Sentry in production.
const SENTRY_DSN = '';

// No `@sentry/profiling-node`: it is a native NAPI addon that calls `uv_default_loop`
// at init, which the Bun runtime (popwers/mini-bun) does not support (oven-sh/bun#18546)
// and crashes the server at startup. Error reporting + tracing work without it.
if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
	Sentry.init({
		environment: process.env.NODE_ENV,
		dsn: SENTRY_DSN,

		tracesSampler: ({ name, parentSampled }) => {
			// Do not sample health checks ever
			if (name.includes('health')) return 0;

			// Continue trace decision, if there is any parentSampled information
			if (typeof parentSampled === 'boolean') {
				return parentSampled;
			}

			// Else, use default sample rate
			return 0.5;
		},

		tracesSampleRate: 0.5,
	});
}
