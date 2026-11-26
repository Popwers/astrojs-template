/**
 * Variables with no default in `astro.config.mjs`. Astro reads them when a request first needs one, so a
 * deployment that lacks one still answers `/api/health` and then fails every sign-in, registration and
 * cookie check. The server refuses to start instead.
 */
export const REQUIRED_ENV: readonly string[] = [
	'COOKIE_SIGNING_SECRET',
	'TURNSTILE_SITE_KEY',
	'TURNSTILE_SECRET_KEY',
];

/**
 * Names of the required variables that are unset or blank.
 * @param env - The process environment.
 * @param names - Variables to check, `REQUIRED_ENV` by default.
 * @returns The missing names, in order. Never their values.
 */
export function missingEnv(env: NodeJS.ProcessEnv, names: readonly string[] = REQUIRED_ENV): string[] {
	return names.filter((name) => (env[name] ?? '').trim() === '');
}

/** Shortest value accepted for a secret: 32 characters, the size of a hex-encoded 128-bit key. */
export const MIN_SECRET_LENGTH = 32;

/**
 * Names of the secrets that are set but shorter than `MIN_SECRET_LENGTH`: a short HMAC key makes
 * the signed session cookies guessable. A blank value is `missingEnv`'s to report.
 * @param env - The process environment.
 * @param names - Secrets to check, the cookie signing secret by default.
 * @returns The weak names, in order. Never their values.
 */
export function weakSecrets(
	env: NodeJS.ProcessEnv,
	names: readonly string[] = ['COOKIE_SIGNING_SECRET'],
): string[] {
	return names.filter((name) => {
		const value = (env[name] ?? '').trim();
		return value !== '' && value.length < MIN_SECRET_LENGTH;
	});
}
