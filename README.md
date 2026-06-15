# Astro Starter Kit

Astro 6 SSR template with React 19 islands, Strapi auth plumbing, PWA support and Sentry monitoring. Runs on Bun.

## Setup

```bash
bun install           # Install dependencies
cp .env.example .env  # Create your local env file, then fill in the values
bun run dev           # Dev server at localhost:4321
```

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRAPI_URL` | Yes (prod) | `https://api.your-project.fr` | Base URL of the Strapi backend. The default lets `bun run build` succeed without a real backend; set it for any real run. |
| `STRAPI_TOKEN` | Yes (prod) | `replace-me-with-a-strapi-api-token` | Strapi API token. The placeholder default keeps the build green out of the box; replace it before talking to a real backend. |
| `SENTRY_AUTH_TOKEN` | No | — | Build-time token for Sentry source-map upload. Not needed at runtime. |
| `SENTRY_RELEASE` | No | — | Deployed git SHA, so errors map to the commit that introduced them. |

The `STRAPI_*` defaults exist only so a fresh clone builds and boots without configuration; they point at no real backend. Auth and data calls will fail until you set real values in `.env`.

## New project checklist

When starting a real project from this template:

- [ ] Rename the project: `name` in `package.json`, `release.repositoryUrl` in `package.json`.
- [ ] Set the canonical site URL: `site` in `astro.config.mjs` (and the `image.domains` / `remotePatterns` host).
- [ ] Fill `.env` from `.env.example`: `STRAPI_URL`, `STRAPI_TOKEN` (replace the placeholder defaults).
- [ ] Wire Sentry: org/project in `astro.config.mjs`, DSN in `sentry.client.config.js` / `sentry.server.config.js`.
- [ ] Install the git hooks once per clone: `vp config`.
- [ ] Regenerate PWA assets from your own icon: `bun run generate-pwa-assets`.

## Project Structure

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
│   ├── lib/                # Helpers (strapi client, cookies, session, PWA)
│   ├── middleware/         # Astro middleware chain
│   ├── pages/              # Routes (file-based)
│   ├── stores/             # Legend State stores
│   ├── styles/             # Tailwind + globals
│   ├── pwa.ts              # Service worker registration
│   └── sw.ts               # Service worker (workbox, injectManifest)
├── astro.config.mjs
├── vite.config.ts          # Vite+ (`vp`) config — lint / fmt / typecheck rules
├── pwa-assets.config.ts    # PWA asset generation preset
├── tsconfig.json
└── Dockerfile              # Production multi-stage build (bun)
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

## Commands

| Command | Action |
|---------|--------|
| `bun install` | Install dependencies |
| `bun run dev` | Dev server at `localhost:4321` |
| `bun run build` | Production build to `./dist/` |
| `bun run preview` | Preview production build locally |
| `bun test` | Run all tests |
| `bun run generate-pwa-assets` | Generate PWA icons/splash from `public/icon.png` |
| `vp check` | Oxlint + Oxfmt + tsgo (lint + fmt + typecheck) |
| `vp check --fix` | Same, with auto-fix |

## Toolchain

- **Runtime**: Bun (NOT npm/yarn)
- **State**: Legend State (NOT React Context)
- **API**: Strapi (`STRAPI_URL` / `STRAPI_TOKEN` env vars)
- **Quality**: Vite+ (`vp`) — Oxlint + Oxfmt + tsgo
- **Git hooks**: `.vite-hooks/` (`vp config` to install)
- **Commits**: Conventional Commits

## Monitoring

Error monitoring via Sentry (`@sentry/astro`, prod-only). Set the DSN in `sentry.client.config.js` / `sentry.server.config.js` and the org/project in `astro.config.mjs`. Source maps + release tagging require `SENTRY_AUTH_TOKEN` and `SENTRY_RELEASE` (git SHA) at build time.

## Deployment

Multi-stage Docker build (Alpine + Bun):
- `base` → `deps` (prod-only via `bun install --no-dev`) → `build` → `runtime`
- BuildKit cache mount on `~/.bun/install/cache` (warm rebuilds skip re-downloading deps)
- `HEALTHCHECK` baked in: `fetch('/login')` returns < 500
- Exposes port `4321`, runtime via `bun ./start.mjs`

```bash
docker build -t your-project .
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
