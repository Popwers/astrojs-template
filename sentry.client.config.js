import * as Sentry from '@sentry/astro';

// Set your project DSN here to enable Sentry in production.
const SENTRY_DSN = '';

if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
	Sentry.init({
		environment: process.env.NODE_ENV,
		dsn: SENTRY_DSN,
		integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],

		// Drop known browser noise (no user impact): navigation/View-Transition aborts
		// and web components re-registered or re-attached by Astro's ClientRouter on
		// client navigation (custom elements + shadow DOM).
		ignoreErrors: [
			'AbortError',
			'Transition was aborted',
			'already hosts a shadow tree',
			'Unable to re-attach to existing ShadowDOM',
			'has already been used with this registry',
			'Invalid value used as weak map key',
		],

		tracesSampler: ({ name, parentSampled }) => {
			// Do not sample health checks ever
			if (name.includes('health')) return 0;

			// Continue trace decision, if there is any parentSampled information
			if (parentSampled !== undefined) {
				return parentSampled;
			}

			// Else, use default sample rate
			return 0.5;
		},

		tracesSampleRate: 0.5,
		replaysSessionSampleRate: 0.02,
		replaysOnErrorSampleRate: 1.0,
	});
}
