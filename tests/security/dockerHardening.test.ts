import { describe, expect, it } from 'bun:test';

function ignorePatterns(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '' && !line.startsWith('#'));
}

function coversDotEnv(patterns: string[]): boolean {
	return patterns.some(
		(pattern) =>
			pattern === '.env' || pattern === '.env*' || pattern === '*.env' || pattern === '**/.env',
	);
}

function coversEnvVariants(patterns: string[]): boolean {
	return patterns.some((pattern) => pattern === '.env.*' || pattern === '.env*' || pattern === '**/.env.*');
}

describe('Docker secret and env hardening', () => {
	it('ignores .env and its variants in the build context', async () => {
		const patterns = ignorePatterns(await Bun.file('.dockerignore').text());
		expect(coversDotEnv(patterns)).toBe(true);
		expect(coversEnvVariants(patterns)).toBe(true);
		expect(patterns.includes('.env.*') && !coversDotEnv(patterns)).toBe(false);
	});

	it('does not persist SENTRY_AUTH_TOKEN as an ARG or ENV layer', async () => {
		const dockerfile = await Bun.file('Dockerfile').text();
		expect(dockerfile).not.toMatch(/^\s*ARG\s+SENTRY_AUTH_TOKEN\b/m);
		expect(dockerfile).not.toMatch(/^\s*ENV\s+SENTRY_AUTH_TOKEN\b/m);
		expect(dockerfile).not.toMatch(/SENTRY_AUTH_TOKEN=\$SENTRY_AUTH_TOKEN/);
		expect(dockerfile).toMatch(/--mount=type=secret,id=SENTRY_AUTH_TOKEN/);
		expect(dockerfile).toMatch(/env=SENTRY_AUTH_TOKEN/);
	});
});
