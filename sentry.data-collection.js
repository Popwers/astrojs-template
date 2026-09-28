/**
 * Sentry v11 collects user info, cookies, request bodies and query data unless told otherwise.
 * This keeps the v10 `sendDefaultPii: false` posture for both the client and the server SDK.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/astro/migration/v10-to-v11/
 */
const IP_HEADER_DENYLIST = ['forwarded', '-ip', 'remote-', 'via', '-user'];

/** @type {NonNullable<Parameters<typeof import('@sentry/astro').init>[0]>['dataCollection']} */
export const dataCollection = {
	userInfo: false,
	cookies: false,
	httpHeaders: {
		request: { deny: IP_HEADER_DENYLIST },
		response: { deny: IP_HEADER_DENYLIST },
	},
	httpBodies: [],
	urlQueryParams: { deny: IP_HEADER_DENYLIST },
	genAI: { inputs: false, outputs: false },
	databaseQueryData: false,
	graphQL: { document: false, variables: false },
};
