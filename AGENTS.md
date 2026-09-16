# Astro.js template

Astro 7 SSR template with React 19 islands, Tailwind 4, Legend State, and Strapi auth plumbing. Vite+ (`vp` / `vpx`) is the JS façade. Bun is the package manager (`bun.lock`) and the test runner. Node is whatever `vp env` provides.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Astro 7 SSR (`@astrojs/node` standalone), React 19 islands |
| UI | Tailwind CSS 4, SCSS primitives, npm `cn` |
| State | Legend State (`useObservable`, `observer`) |
| API | Strapi (`STRAPI_URL`, `STRAPI_TOKEN`) |
| Validation | Zod (Astro actions) |
| Animation | Motion |
| Runtime | Bun |
| Toolchain | Vite+ (`vp`). Oxlint, Oxfmt, tsgo, git hooks |

Dev, build, and preview stay on the Astro CLI (`astro dev --host`, `astro build`, `astro preview`). Never `vp dev`.

## Commands

Type `make` for the list. `vp` calls bun here because `packageManager` is bun.

| Need | Command | What it runs |
| --- | --- | --- |
| Install + hooks | `make install` | `vp i` then `vp config` |
| Dev server (`localhost:4321`) | `make dev` | `vp run dev` → `astro dev --host` |
| Lint + fmt + types | `make check` | `vp check` |
| Tests | `make test` | `vp run test` → `bun test` |
| Production build | `make build` | `vp run build` → `astro build` |
| Preview the build | `make preview` | `vp run preview` → `astro preview` |
| One-shot local binary | `vpx <bin>` | Vite+ one-shot (for example `vpx shadcn@latest migrate cn`) |

The suite is bun:test. Files import from `bun:test`. `bunfig.toml` preloads `tests/setup/bunAstroStubs.ts`. `vp test` is the built-in Vitest runner and is not the project gate. Three tests still call `Bun.file`, so `vp test` fails. Keep `"test": "bun test"` in `package.json`.

After UI edits, run `make check` and fix every `shadcn/*` error.

## Lint

Vendored [anti-slop](https://github.com/dmmulroy/anti-slop) lives at `tools/oxlint/anti-slop/`. Cite that repo, not only the vendored copy.

`@shadcn/lint` and npm `cn` are installed. `vite.config.ts` loads `@shadcn/lint` only when `node_modules/@shadcn/lint` exists (`hasShadcnLint`). The six `shadcn/*` rules are `error` (`no-restyle` allows `layout`). They are off under `components/ui`. `shadcn/no-inline-styles` is off on `**/*.astro` because that rule flags `<style>` elements. SCSS primitives stay on a `no-unknown-classes` allow-list.

Class merges go through `cn`. `src/lib/utils.ts` re-exports `export { cn } from "cn"`.

Ignore `.grok/**`.

No `as any`. Every kept assertion needs a `// SAFETY: <checked invariant>` line. Fix the type. Do not suppress anti-slop.

## Layout

Path aliases in `tsconfig.json`. Use them instead of relative imports (`@lib/*`, `@components/*`, `@actions/*`, and the rest).

| Path | Role |
| --- | --- |
| `src/pages/` | File-based routes |
| `src/layouts/` | Astro layouts |
| `src/components/` | Astro and React islands |
| `src/actions/` | Astro server actions (auth, user, password) |
| `src/middleware/` | Session hydration and route guards |
| `src/lib/` | Strapi client, cookies, `cn` |
| `src/stores/` | Legend State stores |
| `src/data/` | Menus, route guards, cookie options |
| `src/styles/` | Tailwind 4 + SCSS |
| `tests/` | bun:test suite, mirrors `src/` |
| `vite.config.ts` | Vite+ lint, fmt, staged hooks, Vitest aliases |
| `Makefile` | Developer entry |

## Git

`vp config` writes hooks into `.vite-hooks/`. The staged check is `vp check --fix`. Conventional commits via `cz` / `ga`. Default branch is `master`.
