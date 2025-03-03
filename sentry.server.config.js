import * as Sentry from '@sentry/astro';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.NODE_ENV === 'production') {
	/*Sentry.init({
		environment: process.env.NODE_ENV,
		dsn: '',
		integrations: [nodeProfilingIntegration()],

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
		profilesSampleRate: 1.0,
	});*/
}
