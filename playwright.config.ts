import { defineConfig, devices } from '@playwright/test';

const APP_PORT = 44321;
const STRAPI_STUB_PORT = 41337;
const isCI = Boolean(process.env.CI);

/**
 * Golden-path suite against the production build (`astro build` + `start.mjs`).
 * Strapi is replaced by `tests/e2e/strapi-stub.ts`. Both servers start fresh on
 * every run so the in-memory login rate limit and the stub accounts reset.
 */
export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: `http://localhost:${APP_PORT}`,
		locale: 'fr-FR',
		serviceWorkers: 'block',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
		},
	],
	webServer: [
		{
			command: 'bun tests/e2e/strapi-stub.ts',
			url: `http://localhost:${STRAPI_STUB_PORT}/api/users/me`,
			env: { STRAPI_STUB_PORT: String(STRAPI_STUB_PORT) },
			reuseExistingServer: false,
		},
		{
			command: 'bun run build && bun ./start.mjs',
			url: `http://localhost:${APP_PORT}/login`,
			env: {
				STRAPI_URL: `http://localhost:${STRAPI_STUB_PORT}`,
				STRAPI_TOKEN: 'e2e-strapi-token',
				COOKIE_SIGNING_SECRET: 'e2e-cookie-signing-secret',
				PORT: String(APP_PORT),
			},
			timeout: 240_000,
			reuseExistingServer: false,
		},
	],
});
