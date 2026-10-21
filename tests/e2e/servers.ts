// Every app port and the Strapi stub port can be overridden so several runs can share one host.
const APP_PORT = Number(process.env.E2E_APP_PORT ?? 44321);
const REJECT_PORT = Number(process.env.E2E_REJECT_PORT ?? 44322);
const CHALLENGE_PORT = Number(process.env.E2E_CHALLENGE_PORT ?? 44323);
const BLOCK_PORT = Number(process.env.E2E_BLOCK_PORT ?? 44324);
const STRAPI_STUB_PORT = Number(process.env.E2E_STRAPI_STUB_PORT ?? 41337);

/** The app whose Turnstile secret always passes. */
const BASE_URL = `http://localhost:${APP_PORT}`;
/** A second instance of the same build whose Turnstile secret always fails. */
const REJECT_URL = `http://localhost:${REJECT_PORT}`;
/** An instance whose Turnstile widget always asks for a click, then passes. */
const CHALLENGE_URL = `http://localhost:${CHALLENGE_PORT}`;
/** An instance whose Turnstile widget always fails the challenge, so no token ever comes. */
const BLOCK_URL = `http://localhost:${BLOCK_PORT}`;

/** Cloudflare's published test keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/ */
const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_CHALLENGE_SITE_KEY = '3x00000000000000000000FF';
const TURNSTILE_BLOCK_SITE_KEY = '2x00000000000000000000AB';
const TURNSTILE_PASS_SECRET_KEY = '1x0000000000000000000000000000000AA';
const TURNSTILE_REJECT_SECRET_KEY = '2x0000000000000000000000000000000AA';

export {
	APP_PORT,
	BASE_URL,
	BLOCK_PORT,
	BLOCK_URL,
	CHALLENGE_PORT,
	CHALLENGE_URL,
	REJECT_PORT,
	REJECT_URL,
	STRAPI_STUB_PORT,
	TURNSTILE_BLOCK_SITE_KEY,
	TURNSTILE_CHALLENGE_SITE_KEY,
	TURNSTILE_PASS_SECRET_KEY,
	TURNSTILE_REJECT_SECRET_KEY,
	TURNSTILE_SITE_KEY,
};
