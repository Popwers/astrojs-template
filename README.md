# Astro starter kit

Astro 7 SSR template with React 19 islands, Strapi auth plumbing, PWA support, and Sentry. Vite+ (`vp`) is the toolchain. Bun is the package manager. Tests run through Vitest (`vp test`).

## Setup

```bash
cp .env.example .env   # then fill in the values
make install           # vp i + vp config
make dev               # Astro dev server at localhost:4321
```

`make install` installs dependencies and Git hooks. `make dev` runs `astro dev --host`. Do not use `vp dev`.

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRAPI_URL` | Yes (prod) | `https://api.your-project.fr` | Base URL of the Strapi backend. The default lets `make build` succeed without a real backend. Set it for any real run. |
| `STRAPI_TOKEN` | Yes (prod) | `replace-me-with-a-strapi-api-token` | Strapi API token. The placeholder keeps the build green out of the box. Replace it before talking to a real backend. |
| `COOKIE_SIGNING_SECRET` | Yes | none | HMAC secret for session cookies. The process throws if this is unset. |
| `TRUST_PROXY` | No | none | `cloudflare` to rate-limit on `CF-Connecting-IP`. `1` or `forwarded` to use `X-Forwarded-For`. Unset ignores spoofable forwarded headers. |
| `SENTRY_AUTH_TOKEN` | No | none | Build-time token for Sentry source-map upload. Pass it as a BuildKit secret, never as an image ARG or ENV. |
| `SENTRY_RELEASE` | No | none | Deployed git SHA, so errors map to the commit that introduced them. |

The `STRAPI_*` defaults exist only so a fresh clone builds and boots without configuration. They point at no real backend. Auth and data calls fail until you set real values in `.env`.

## New project checklist

When you start a real project from this template:

- [ ] Rename the project: `name` in `package.json`.
- [ ] Set the canonical site URL: `site` in `astro.config.mjs` (and the `image.domains` / `remotePatterns` host).
- [ ] Fill `.env` from `.env.example`: `STRAPI_URL`, `STRAPI_TOKEN`, `COOKIE_SIGNING_SECRET`.
- [ ] Wire Sentry: org/project in `astro.config.mjs`, `PUBLIC_SENTRY_DSN` as a build arg.
- [ ] Run `make install` once per clone so Git hooks land in `.vite-hooks/`.
- [ ] Regenerate PWA assets from your own icon: `vp run generate-pwa-assets`.

## Project structure

```text
/
├── public/                 # Static assets (favicon, icons, PWA assets)
├── src/
│   ├── actions/            # Astro server actions (auth, password, user)
│   ├── assets/             # Imported assets (images, icons)
│   ├── components/         # React + Astro components
│   ├── data/               # Static data (menus, routes, cookie/user options)
│   ├── interfaces/         # Shared TypeScript types
│   ├── layouts/            # Astro layouts
│   ├── lib/                # Helpers (strapi client, cookies, session, PWA, cn)
│   ├── middleware/         # Astro middleware chain
│   ├── pages/              # Routes (file-based)
│   ├── stores/             # Legend State stores
│   ├── styles/             # Tailwind + globals
│   ├── pwa.ts              # Service worker registration
│   └── sw.ts               # Service worker (workbox, injectManifest)
├── tests/                  # Vitest suite (`vp test`)
├── Makefile                # install, dev, check, test, build
├── astro.config.mjs
├── vite.config.ts          # Vite+ (`vp`) config. Lint, fmt, typecheck.
├── pwa-assets.config.ts    # PWA asset generation preset
├── tsconfig.json
└── Dockerfile              # Production multi-stage build (bun)
```

Astro looks for `.astro` or `.md` files in `src/pages/`. Each page is a route based on its file name.

## Commands

Type `make` (or `make help`) to list targets.

| Command | Action |
|---------|--------|
| `make install` | Install dependencies (`vp i`) and Git hooks (`vp config`) |
| `make dev` | Dev server at `localhost:4321` (`astro dev --host`) |
| `make check` | Oxlint + Oxfmt + tsgo (`vp check`) |
| `make test` | Run all tests (`vp test`) |
| `vp run test:e2e` | Playwright golden paths against a stub Strapi (`tests/e2e`) |
| `make build` | Production build to `./dist/` (`astro build`) |
| `make preview` | Preview the production build (`astro preview`) |
| `vp run generate-pwa-assets` | Generate PWA icons/splash from `public/icon.png` |
| `vp check --fix` | Same as `make check`, with auto-fix |

The test script is `vp test`. Tests import from `vitest`. The Makefile target is `vp test`, not `vp run test`.

The E2E suite in `tests/e2e` runs through Playwright, not Vitest. Install Chromium once with `vpx playwright install chromium`, then run `vp run test:e2e`. Playwright builds the app, starts it on port 44321, and starts the Bun stub Strapi on port 41337. No real Strapi is needed. Failures keep a trace in `test-results/`. Open the report with `vpx playwright show-report`.

## Toolchain

- **Façade**: Vite+ (`vp` / `vpx`). Type `vp` in this repo. Do not type `npm i` / `npx` / `bun add`.
- **Package manager**: bun (`bun.lock`)
- **Quality**: Oxlint + Oxfmt + tsgo via `vp check`. Vendored [anti-slop](https://github.com/dmmulroy/anti-slop). Tailwind also uses `@shadcn/lint` and npm `cn`.
- **Git hooks**: `.vite-hooks/` (`make install` or `vp config`)
- **State**: Legend State
- **API**: Strapi (`STRAPI_URL` / `STRAPI_TOKEN`)
- **Commits**: Conventional Commits (`cz` / `ga`)

## Monitoring

Error monitoring via Sentry (`@sentry/astro`, prod-only). The DSN comes from `PUBLIC_SENTRY_DSN` at build time (empty keeps Sentry off); set the org/project in `astro.config.mjs`. Source maps and release tagging need `SENTRY_AUTH_TOKEN` and `SENTRY_RELEASE` (git SHA) at build time.

## Deployment

Multi-stage Docker build (Alpine + Bun):

- `base` → `deps` (prod-only via `bun install --no-dev`) → `build` → `runtime`
- BuildKit cache mount on `~/.bun/install/cache`
- `HEALTHCHECK` baked in: `fetch('/login')` returns < 500
- Exposes port `4321`, runtime via `bun ./start.mjs`

```bash
docker build --secret id=SENTRY_AUTH_TOKEN,env=SENTRY_AUTH_TOKEN -t your-project .
docker run -p 4321:4321 --env-file .env your-project
```

## Technologies

- [Astro](https://astro.build) (SSR)
- [React](https://react.dev) (islands)
- [Legend State](https://legendapp.com/open-source/state/) (reactive state)
- [Tailwind CSS](https://tailwindcss.com)
- [Bun](https://bun.sh) (runtime + package manager)
- [Vite+](https://vite.plus) (toolchain)
- [Strapi](https://strapi.io) (API backend)
