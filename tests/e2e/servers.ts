// Both app ports and the Strapi stub port can be overridden so several runs can share one host.
const APP_PORT = Number(process.env.E2E_APP_PORT ?? 44321);
const REJECT_PORT = Number(process.env.E2E_REJECT_PORT ?? 44322);
const STRAPI_STUB_PORT = Number(process.env.E2E_STRAPI_STUB_PORT ?? 41337);

/** The app whose Turnstile secret always passes. */
const BASE_URL = `http://localhost:${APP_PORT}`;
/** A second instance of the same build whose Turnstile secret always fails. */
const REJECT_URL = `http://localhost:${REJECT_PORT}`;

/** Cloudflare's published test keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/ */
const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_PASS_SECRET_KEY = '1x0000000000000000000000000000000AA';
const TURNSTILE_REJECT_SECRET_KEY = '2x0000000000000000000000000000000AA';

export {
	APP_PORT,
	BASE_URL,
	REJECT_PORT,
	REJECT_URL,
	STRAPI_STUB_PORT,
	TURNSTILE_PASS_SECRET_KEY,
	TURNSTILE_REJECT_SECRET_KEY,
	TURNSTILE_SITE_KEY,
};
