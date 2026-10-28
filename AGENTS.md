# Astro.js template

Astro 7 template (static by default, on-demand routes on the Node adapter) with React 19 islands, Tailwind 4, Legend State, and Strapi auth. The package manager is Bun (`bun.lock`). Vite+ (`vp`) is the JS façade. Dev, build, and preview stay on the Astro CLI. Never run `vp dev` here. That starts a bare Vite server and skips routing, SSR, and the Node adapter.

## Stack

| Layer | Choice |
| --- | --- |
| App | Astro 7 `output: 'static'` + `@astrojs/node` standalone for `prerender = false` routes, React 19 islands |
| UI | Tailwind CSS 4, SCSS, npm `cn` |
| State | Legend State (`useObservable`, `observer`) |
| API | Strapi (`STRAPI_URL`, `STRAPI_TOKEN`) |
| Validation | Zod on Astro actions |
| Runtime | Bun |
| Toolchain | Vite+ (`vp`): Oxlint, Oxfmt, tsgo, Vitest, Git hooks |

## Commands

Type `make` for the list. `vp` calls bun because `packageManager` is bun.

| Need | Command | What it runs |
| --- | --- | --- |
| Install + hooks | `make install` | `vp i` then `vp config` |
| Dev server (`localhost:4321`) | `make dev` | `vp run dev` → `astro dev --host` |
| Lint + fmt + types | `make check` | `vp check` |
| Tests | `make test` | `vp test` |
| Pre-push gate | `make verify` | `astro sync`, `vp check`, `astro check`, `vp test run`, portability guard, build |
| E2E golden paths | `vp run test:e2e` | `e2e run` against the stub Strapi in `tests/e2e` |
| Production build | `make build` | `vp run build` → `astro build` |
| Preview the build | `make preview` | `vp run preview` → `astro preview` |
| One-shot binary | `vpx <bin>` | Vite+ one-shot |

The e2e runner (`e2e.config.ts`) starts `tests/e2e/serve.sh`, which runs `tests/e2e/strapi-stub.ts` on port 41337, builds the app and serves it on port 44321, plus three more instances of the build for Turnstile: port 44322 whose secret always fails, port 44323 whose site key always asks for a click, port 44324 whose site key always blocks (`E2E_STRAPI_STUB_PORT`, `E2E_APP_PORT`, `E2E_REJECT_PORT`, `E2E_CHALLENGE_PORT` and `E2E_BLOCK_PORT` override them; ports and Turnstile test keys live in `tests/e2e/servers.ts`); the runner downloads Chromium on first use and the widget loads from `challenges.cloudflare.com`, so the run needs network access to it. Add a stub route when a golden path calls a new Strapi endpoint. `vp run test:e2e:ci` is the run the pre-push gate uses: it skips the `agent`-tagged test, which needs a model login (`bunx e2e login spacexai`). Results land in `.e2e/` (`report.json`, `logs/app.log`). Vitest excludes `tests/e2e`.

Default branch is `master`. Conventional commits via `cz` / `ga`. `vp config` writes hooks into `.vite-hooks/` (installed with the dependencies by `prepare`, or `make hooks`). The staged check is `vp check --fix`.

There is no CI workflow. Checks run locally in the `pre-push` hook: `make verify`, then e2e when the push touches app code. `git push --no-verify` bypasses it once. Releases stay on GitHub (`versionning.yml`, `ubuntu-latest`).

## Architecture

### Middleware

`src/middleware/index.ts` skips prerendered routes (it would run once at build, cookie-less), then runs `sequence` in this order:

1. `pageCache` — `Cache-Control` of on-demand pages (`src/lib/pageCache.ts`): public at the edge for an anonymous 200 GET, `private, no-store` for a session cookie, `PRIVATE_ROUTES`, redirects, errors and POSTs
2. `normalizePath`
3. `userDataHydratation` — cookies into `context.locals`
4. `checkRegistration` — profile completion
5. `restrictedWhenNotLogged` — dashboard routes
6. `restrictedWhenLogged` — auth pages

Route lists live in `src/data/routes.ts`:

- `RESTRICTED_WHEN_LOGGED_IN` — login, register, lost-password
- `RESTRICTED_WHEN_LOGGED_OUT` — `/dashboard`, `/dashboard/account`, `/register/profil`
- `NEED_REGISTER_ROUTES` — routes that need a completed profile
- `PRIVATE_ROUTES` — never stored by a shared cache (auth flow, dashboard, server islands, actions)

### Astro actions

Server form handlers in `src/actions/`. Zod schemas in `src/actions/schema/`. Export them from `src/actions/index.ts`.

- `auth` — login, register, logout, email confirmation
- `user` — profile
- `password` — reset

Helpers sit in `src/actions/utility/` (`scopedRequest`, translations).

### Strapi

`src/lib/strapi.ts` and `src/lib/strapiClient.ts`. `fetchApi()` for GET. `submitApi()` for mutations. Calls time out at 30 seconds.

### Auth cookies

Configured in `src/data/cookieOptions.ts`.

- `user_token` — JWT from Strapi
- `user_data` — cached user
- `user_data_timestamp` — cache invalidation

### Path aliases

Use `tsconfig.json` aliases instead of relative imports: `@pages/*`, `@styles/*`, `@layouts/*`, `@components/*`, `@assets/*`, `@data/*`, `@lib/*`, `@interfaces/*`, `@stores/*`, `@actions/*`.

## Environment

Copy `.env.example` to `.env`. The schema is in `astro.config.mjs` (`envField`).

| Variable | Role |
| --- | --- |
| `STRAPI_URL` | Strapi API origin |
| `STRAPI_TOKEN` | Strapi API token |
| `COOKIE_SIGNING_SECRET` | Signed cookies |
| `TURNSTILE_SITE_KEY` | Turnstile widget site key (runtime) |
| `TURNSTILE_SECRET_KEY` | Turnstile siteverify secret (runtime) |
| `TRUST_PROXY` | Reverse-proxy trust |
| `SENTRY_AUTH_TOKEN` | Sentry (optional) |
| `SENTRY_RELEASE` | Sentry release name (optional) |
| `SENTRY_TRACES_SAMPLE_RATE` | Sentry traces rate at build time, default `0.1` (optional) |

## Layout

| Path | Role |
| --- | --- |
| `src/pages/` | File-based routes |
| `src/layouts/` | Astro layouts |
| `src/components/site/global/` | Shared UI |
| `src/actions/` | Server actions |
| `src/middleware/` | Session and guards |
| `src/lib/` | Strapi client, cookies, `cn`, Sentry noise filters (`sentryNoise.ts`) |
| `src/stores/` | Legend State |
| `src/data/` | Menus, route guards, cookie options, schema.org |
| `src/styles/` | Tailwind 4 + SCSS |
| `tests/` | Vitest, mirrors `src/` |
| `tests/e2e/` | e2e golden paths, stub Strapi, `serve.sh` |
| `e2e.config.ts` | e2e runner: app command, accounts, agent model |
| `vite.config.ts` | Lint, fmt, staged hooks, test |
| `Makefile` | Developer entry |
| `Dockerfile` | Multi-stage production image |
| `start.mjs` | Production entry: imports the adapter with autostart off, hands it to `server/start.ts` |
| `server/` | Production HTTP server: security headers and CSP on every response (`securityHeaders.ts`, no HSTS: Cloudflare sends it), precompressed static files and their `Cache-Control`, graceful SIGTERM drain; `cacheControl.ts` holds the header values the middleware shares |
| `src/integrations/precompress.ts` | Writes `.br`/`.gz` next to the text files of `dist/client` at build |

## Docker

```bash
docker build -t astro-app .
docker run -p 4321:4321 astro-app
```

## SEO

`astro-seo`, `astro-capo`, `astro-seo-schema`. Schema lives in `src/data/schema.org.ts`. Sitemap comes from `@astrojs/sitemap`.

## Common tasks

Add a page: create `src/pages/*.astro`, import a layout from `@layouts/`. It is prerendered unless it exports `prerender = false` (needed to read cookies, handle a form or fetch Strapi per request). A protected page goes in `src/data/routes.ts`; an on-demand page whose HTML differs per visitor goes in `PRIVATE_ROUTES` or sets `Cache-Control: private, no-store` itself. Per-visitor bits on a shared page go in a `server:defer` island.

Add an action: Zod schema in `src/actions/schema/`, handler in `src/actions/`, export from `src/actions/index.ts`.

Protect a public form: `<Turnstile />` inside the form (managed widget, `appearance: 'interaction-only'`, hidden until Cloudflare asks for a click; it holds a submit until the token exists and writes its own status line), `...turnstile` in its Zod schema, `await assertTurnstile(context, input['cf-turnstile-response'])` in its handler after `assertRateLimit`.

Add a shared component: `src/components/site/global/`. `.astro` for server, `.tsx` for interactive React. Import with `@components/...`.

## Lint

Vendored anti-slop lives in `tools/oxlint/anti-slop/`. `@shadcn/lint` loads when `node_modules/@shadcn/lint` exists. After UI edits, `make check` and fix `shadcn/*` errors. Class merges go through `cn` (`src/lib/utils.ts` re-exports `export { cn } from 'cn'`).
