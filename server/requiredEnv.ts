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
