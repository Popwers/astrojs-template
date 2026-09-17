# Astro.js template

Astro 7 SSR template with React 19 islands, Tailwind 4, Legend State, and Strapi auth. The package manager is Bun (`bun.lock`). Vite+ (`vp`) is the JS façade. Dev, build, and preview stay on the Astro CLI. Never run `vp dev` here. That starts a bare Vite server and skips routing, SSR, and the Node adapter.

## Stack

| Layer | Choice |
| --- | --- |
| App | Astro 7 SSR (`@astrojs/node` standalone), React 19 islands |
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
| Production build | `make build` | `vp run build` → `astro build` |
| Preview the build | `make preview` | `vp run preview` → `astro preview` |
| One-shot binary | `vpx <bin>` | Vite+ one-shot |

Default branch is `master`. Conventional commits via `cz` / `ga`. `vp config` writes hooks into `.vite-hooks/`. The staged check is `vp check --fix`.

## Architecture

### Middleware

`src/middleware/index.ts` runs `sequence` in this order:

1. `normalizePath`
2. `userDataHydratation` — cookies into `context.locals`
3. `checkRegistration` — profile completion
4. `restrictedWhenNotLogged` — dashboard routes
5. `restrictedWhenLogged` — auth pages

Route lists live in `src/data/routes.ts`:

- `RESTRICTED_WHEN_LOGGED_IN` — login, register, lost-password
- `RESTRICTED_WHEN_LOGGED_OUT` — `/dashboard`, `/dashboard/account`, `/register/profil`
- `NEED_REGISTER_ROUTES` — routes that need a completed profile

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
| `TRUST_PROXY` | Reverse-proxy trust |
| `SENTRY_AUTH_TOKEN` | Sentry (optional) |
| `SENTRY_RELEASE` | Sentry release name (optional) |

## Layout

| Path | Role |
| --- | --- |
| `src/pages/` | File-based routes |
| `src/layouts/` | Astro layouts |
| `src/components/site/global/` | Shared UI |
| `src/actions/` | Server actions |
| `src/middleware/` | Session and guards |
| `src/lib/` | Strapi client, cookies, `cn` |
| `src/stores/` | Legend State |
| `src/data/` | Menus, route guards, cookie options, schema.org |
| `src/styles/` | Tailwind 4 + SCSS |
| `tests/` | Vitest, mirrors `src/` |
| `vite.config.ts` | Lint, fmt, staged hooks, test |
| `Makefile` | Developer entry |
| `Dockerfile` | Multi-stage production image |
| `start.mjs` | Production Node entry |

## Docker

```bash
docker build -t astro-app .
docker run -p 4321:4321 astro-app
```

## SEO

`astro-seo`, `astro-capo`, `astro-seo-schema`. Schema lives in `src/data/schema.org.ts`. Sitemap comes from `@astrojs/sitemap`.

## Common tasks

Add a page: create `src/pages/*.astro`, import a layout from `@layouts/`, update `src/data/routes.ts` if it is protected.

Add an action: Zod schema in `src/actions/schema/`, handler in `src/actions/`, export from `src/actions/index.ts`.

Add a shared component: `src/components/site/global/`. `.astro` for server, `.tsx` for interactive React. Import with `@components/...`.

## Lint

Vendored anti-slop lives in `tools/oxlint/anti-slop/`. `@shadcn/lint` loads when `node_modules/@shadcn/lint` exists. After UI edits, `make check` and fix `shadcn/*` errors. Class merges go through `cn` (`src/lib/utils.ts` re-exports `export { cn } from 'cn'`).
