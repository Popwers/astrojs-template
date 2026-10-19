import { IGNORE_SENTRY_ERRORS, isVisitorNetworkFailure } from '@lib/sentryNoise';
import * as Sentry from '@sentry/astro';

import { dataCollection } from './sentry.data-collection.js';

// Build-time DSN (PUBLIC_SENTRY_DSN, inlined in client and server bundles). Empty keeps Sentry off.
const SENTRY_DSN = import.meta.env.PUBLIC_SENTRY_DSN;

// CMS origin, inlined at build from STRAPI_URL (astro.config.mjs).
const apiOrigins = [__STRAPI_URL__];

if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
	Sentry.init({
		environment: process.env.NODE_ENV,
		dsn: SENTRY_DSN,
		dataCollection,
		integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],

		// Drop known browser noise (no user impact) and visitor network failures. The patterns are
		// anchored and tested in src/lib/sentryNoise.ts.
		ignoreErrors: [...IGNORE_SENTRY_ERRORS],

		beforeSend: (event) => (isVisitorNetworkFailure(event, apiOrigins) ? null : event),

		tracesSampler: ({ name, parentSampled }) => {
			if (name.includes('health')) return 0;

			if (parentSampled !== undefined) {
				return parentSampled;
			}

			return 0.5;
		},

		tracesSampleRate: 0.5,
		replaysSessionSampleRate: 0.02,
		replaysOnErrorSampleRate: 1.0,
	});
}
