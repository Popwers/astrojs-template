import { web } from '@e2e-dev/web';
import type { E2EConfig } from 'e2e';
import { grok } from 'e2e/oauth/grok';

import { EDITOR, READER } from './tests/e2e/accounts';
import {
	APP_PORT,
	BASE_URL,
	REJECT_PORT,
	STRAPI_STUB_PORT,
	TURNSTILE_PASS_SECRET_KEY,
	TURNSTILE_REJECT_SECRET_KEY,
	TURNSTILE_SITE_KEY,
} from './tests/e2e/servers';

/**
 * Golden-path suite against the production build. `tests/e2e/serve.sh` starts the in-memory
 * Strapi stub (`tests/e2e/strapi-stub.ts`), builds the app and serves it twice with `start.mjs`: on
 * `APP_PORT` with the Turnstile always-pass secret and on `REJECT_PORT` with the always-fail one.
 * Everything starts fresh on every run, so the in-memory rate limits and the stub accounts reset.
 */
export default {
	targets: [
		{
			engine: web({
				locale: 'fr-FR',
				viewport: { width: 1440, height: 900 },
				initScripts: [
					{ path: 'tests/e2e/page-errors.js' },
					// Hides the service worker API, as Playwright's `serviceWorkers: 'block'` did: the
					// PWA worker would otherwise cache pages between the steps of a test.
					() => {
						Reflect.deleteProperty(Navigator.prototype, 'serviceWorker');
					},
				],
			}),
			app: {
				url: BASE_URL,
				readyUrl: `${BASE_URL}/login`,
				command: {
					executable: 'bash',
					args: ['tests/e2e/serve.sh'],
					startupTimeout: 240_000,
					log: '.e2e/logs/app.log',
					env: {
						PORT: String(APP_PORT),
						STRAPI_STUB_PORT: String(STRAPI_STUB_PORT),
						STRAPI_URL: `http://localhost:${STRAPI_STUB_PORT}`,
						STRAPI_TOKEN: 'e2e-strapi-token',
						COOKIE_SIGNING_SECRET: 'e2e-cookie-signing-secret',
						TURNSTILE_SITE_KEY,
						TURNSTILE_SECRET_KEY: TURNSTILE_PASS_SECRET_KEY,
						TURNSTILE_REJECT_SECRET_KEY,
						REJECT_PORT: String(REJECT_PORT),
					},
				},
			},
		},
	],
	trace: 'retain-on-failure',
	credentials: {
		reader: { username: READER.user.email, password: READER.password },
		editor: { username: EDITOR.user.email, password: EDITOR.password },
	},
	// SuperGrok subscription: sign in once with `bunx e2e login spacexai`; `bunx e2e models spacexai` lists the ids.
	agents: {
		default: {
			model: grok('grok-4.7'),
			system: 'You are a thorough QA agent. Verify every outcome on screen.',
			context:
				'A French Astro site with a Strapi account area. "Se connecter" is log in, "Mon compte" the dashboard, "Mon profil" the profile page, "Enregistrer" saves.',
		},
	},
} satisfies E2EConfig;
