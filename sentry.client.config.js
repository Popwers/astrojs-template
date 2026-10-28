import { IGNORE_SENTRY_ERRORS, isVisitorNetworkFailure } from '@lib/sentryNoise';
import { createTracesSampler, parseTracesSampleRate } from '@lib/sentrySampling';
import * as Sentry from '@sentry/astro';
import { hasAnalyticsConsent } from '@stores/consentStore';

import { dataCollection } from './sentry.data-collection.js';

// Build-time DSN (PUBLIC_SENTRY_DSN, inlined in client and server bundles). Empty keeps Sentry off.
const SENTRY_DSN = import.meta.env.PUBLIC_SENTRY_DSN;

// CMS origin, inlined at build from STRAPI_URL (astro.config.mjs).
const apiOrigins = [__STRAPI_URL__];

// SENTRY_TRACES_SAMPLE_RATE at build time, default 0.1 (src/lib/sentrySampling.ts).
const tracesRate = parseTracesSampleRate(__SENTRY_TRACES_SAMPLE_RATE__);

if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
	// Replay records the session, so it loads only after the visitor accepts analytics cookies. Saving a
	// choice in the cookie banner reloads the page, which re-runs this init with the new consent.
	const integrations = [Sentry.browserTracingIntegration()];
	if (hasAnalyticsConsent()) integrations.push(Sentry.replayIntegration());

	Sentry.init({
		environment: process.env.NODE_ENV,
		dsn: SENTRY_DSN,
		dataCollection,
		integrations,

		// Drop known browser noise (no user impact) and visitor network failures. The patterns are
		// anchored and tested in src/lib/sentryNoise.ts.
		ignoreErrors: [...IGNORE_SENTRY_ERRORS],

		beforeSend: (event) => (isVisitorNetworkFailure(event, apiOrigins) ? null : event),

		tracesSampler: createTracesSampler(tracesRate),
		tracesSampleRate: tracesRate,
		// No session sampling: replay keeps only the buffer before an error, and only with consent.
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: 1.0,
	});
}
