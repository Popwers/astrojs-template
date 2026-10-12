---
name: verify-astrojs
description: Drive the Astro starter template (Astro SSR web UI) the way a user does. Isolated local instance, default port 4331. Use when proving a mapped feature, reproducing a UI bug, or checking home, login, register, lost-password, or legal pages before shipping.
---

# Verify astrojs-template

Project-local control skill for **astrojs-template** (`Popwers/astrojs-template`). Primary surface is the Astro SSR web UI. There is no end-user CLI. Strapi is an external API. This skill never points at a real remote CMS: it runs the repo's in-memory Strapi stub (`tests/e2e/strapi-stub.ts`) on loopback instead.

Read `features/README.md` before driving. Drive one mapped feature per recipe. Do not invent entry points.

## Launch

Isolated stack only. Default port is **4331** so a human `bun run dev` on 4321 is left alone. The Strapi stub defaults to **4381**, below the kernel ephemeral port range, so a TIME-WAIT socket cannot block its bind. There is no local database.

```bash
.cursor/skills/verify-astrojs/bin/control-astrojs launch
```

Ready when `control-astrojs doctor` exits 0: `GET /login` is HTTP `< 500` and the body contains `Se connecter`, and `GET /` is HTTP 200 with `Welcome to Astro`.

What launch does:

1. Writes `/tmp/verify-astrojs/state` and `run.env` (generated `COOKIE_SIGNING_SECRET`, never committed).
2. Runs `bun install` if `node_modules` is missing.
3. Puts Node `>=22.12` on `PATH` (Astro 7 refuses system Node 20). Prefers `vp env` Node, then Vite+ runtimes under `~/.local/share/vite-plus/js_runtime/node/`.
4. Starts `bun tests/e2e/strapi-stub.ts` with `STRAPI_STUB_PORT=<stub port>` and waits until it answers. The stub knows two users from `tests/e2e/accounts.ts` and serves only `auth/local`, `users/me`, and `PUT users/:id`; every other Strapi call gets a 404 envelope, so CMS content falls back to empty.
5. Starts `./node_modules/.bin/astro dev --ignore-lock --host 127.0.0.1 --port <port>` with disposable env only:
   - `COOKIE_SIGNING_SECRET` — random 32-byte hex; required, the process throws if unset
   - `STRAPI_URL=http://127.0.0.1:<stub port>` — the loopback stub, never a public host
   - `STRAPI_TOKEN=verify-stub-token`
6. Waits until `GET /login` answers `< 500`.

Keep `--ignore-lock`. Astro 7 detects an agent caller and moves `astro dev` to a detached background server unless that flag is set, which orphans the server from the recorded PID. Do not write `.env` in the repo. Do not use `vp run dev -- --port` (Vite+ forwards those flags as a broken Astro command). Do not use `astro preview`; production-shaped boot is `bun run build` then `bun ./start.mjs` with `HOST`/`PORT` and the same env, only when a recipe says so.

Teardown is `control-astrojs cleanup`. It kills the PIDs recorded in the state file. It does not kill by process name.

Manual equivalent (only when the CLI cannot run):

```bash
STRAPI_STUB_PORT=4381 bun tests/e2e/strapi-stub.ts &
export COOKIE_SIGNING_SECRET="$(openssl rand -hex 32)"
export STRAPI_URL=http://127.0.0.1:4381
export STRAPI_TOKEN=verify-stub-token
./node_modules/.bin/astro dev --ignore-lock --host 127.0.0.1 --port 4331
```

## Doctor

```bash
.cursor/skills/verify-astrojs/bin/control-astrojs doctor
```

Doctor answers "is this instance worth driving?" It must be yes on all of:

- State file exists at `/tmp/verify-astrojs/state` and was written by `launch`.
- Recorded app PID and Strapi stub PID are alive.
- Recorded app port and stub port are listening.
- `GET /login` is HTTP `< 500` and the body contains `Se connecter` (same probe as the Docker `HEALTHCHECK`).
- `GET /` is HTTP 200 and the body contains `Welcome to Astro`.

If anything looks off, stop. Do not attach to `localhost:4321` or any instance this run did not start.

## Drive

Harness is `control-astrojs` (HTTP + optional Chrome). Prefer HTTP for status, redirects, and HTML markers. Use Chrome when the proof needs a painted frame or a click the HTML dump cannot show.

```bash
.cursor/skills/verify-astrojs/bin/control-astrojs http GET /
.cursor/skills/verify-astrojs/bin/control-astrojs http GET /login
.cursor/skills/verify-astrojs/bin/control-astrojs http GET /dashboard --no-follow
.cursor/skills/verify-astrojs/bin/control-astrojs screenshot --path artifacts/home.png --url /
.cursor/skills/verify-astrojs/bin/control-astrojs drive public-home
.cursor/skills/verify-astrojs/bin/control-astrojs drive auth-login
```

Stable handles from this repo:

| Surface | Handle |
| --- | --- |
| Home hero | text `Welcome to Astro` (`src/pages/index.astro`) |
| Home document title | `Your project \| Accueil` |
| Nav home | link text `Accueil`, href `/` |
| Nav placeholders | `Menu 1` → `/menu1`, `Menu 2 + Sous menu` → `/menu2` (those routes 404) |
| Anon session links | `Se connecter` → `/login`, `S'inscrire` → `/register` (`AvatarIsland`, `server:defer`) |
| Login heading | `Se connecter` on `/login` |
| Login fields | `#email` (`Adresse mail`), `#password` (`Mot de passe`), button `Se connecter` |
| Login extras | link `Inscrivez-vous` → `/register`, link `Mot de passe oublié ?` → `/lost-password`, link `Retour à l'accueil` → `/` |
| Register heading | `S’inscrire` (U+2019 apostrophe) on `/register` |
| Register fields | `#email`, `#password`, `#passwordConfirmation`, button `S’inscrire` |
| Lost-password heading | `Vous avez oublié votre mot de passe ?` on `/lost-password` |
| Lost-password submit | button `Réinitialiser mon mot de passe` |
| Dashboard (authed) | heading `Mon compte`, `#logout-button` `Se déconnecter`, link `Informations personnelles` → `/dashboard/account` |
| Legal | `h1` `Mentions légales`, `h1` `Politique de confidentialité` |
| Footer legal | links `/mentions-legales`, `/politique-confidentialite` |
| Cookie banner | `#cookie-banner`, `#accept-all-cookies`, `#customize-cookies` (HTML present; visible after client JS) |
| 404 | heading `Page non trouvée`, link `Retourner à l'accueil` |
| Health probe | `GET /login` status `< 500` |

There is no `/api/health`. Docker probes `/login`.

Route gates (`src/data/routes.ts` + middleware):

- Logged-out `/dashboard`, `/dashboard/account`, `/register/profil` → 302 `/login`
- Logged-in `/login`, `/register`, `/register/mail-confirmation`, `/lost-password`, `/lost-password/reset`, `/lost-password/wait-mail` → 302 `/dashboard`
- `/register/mail-confirmation` without cookie `mail-confirmation` → 302 `/register`
- `/lost-password/wait-mail` without cookie `wait-mail-password` → 302 `/lost-password`
- `/lost-password/reset` without cookie `password-reset-code` (or `?code=`) → 302 `/lost-password`

A successful login sets `user_token`, `user_data`, and `user_data_timestamp`. Login works on this stack against the stub reader `jean.dupont@example.com` / `Lecteur-2026!` (`tests/e2e/accounts.ts`); `drive auth-login` runs the round trip with a cookie jar. Action POSTs need `Origin: <origin>` or Astro answers 403. Register, mail confirmation, and password-reset POSTs call Strapi endpoints the stub does not serve, so they stay **verified-unreachable**. Do not POST credentials at a shared or production API to "complete" the map. Do not mint session cookies by writing `user_token` by hand.

`AvatarIsland` is `server:defer`. First-paint `GET /` often has the `Loader` fallback instead of `Se connecter`. Prove the login control on `/login`, or after hydration in Chrome.

## Evidence

Default proof directory for a named drive:

```text
.cursor/skills/verify-astrojs/proof/<feature-id>/
```

Ad-hoc runs may also write `/tmp/verify-astrojs/artifacts/<run-id>/`. Cleanup deletes scratch under `/tmp/verify-astrojs/` except `proof/` copies already placed in the skill directory.

Every proof includes:

- The user action (command + URL).
- The resulting state (status, redirect, HTML marker, or screenshot).
- Side effects when the feature mutates data (second GET). Login is proven by the dashboard GET that follows it. Register and password-reset mutations cannot be proven without a real Strapi — report `verified-unreachable`.
- `manifest.json` with `feature`, `baseUrl`, `commands`, `checks`.

Standards:

- Exercise the real path (`/`, `/login`, `/register`), not a test-only setter.
- Capture the action and the result, not only the last screen.
- A 200 on `/` is not enough for `public-home`. The HTML must contain `Welcome to Astro`.
- A 200 on `/login` is not enough for `auth-login`. Assert `Se connecter`, `#email`, `#password`, and the logged-out `/dashboard` → `/login` redirect.
- Chrome screenshots must show the page identity (`Welcome to Astro` on home, `Se connecter` on login). Headless Chrome is `/usr/bin/google-chrome` or `google-chrome` when present. Chrome often writes the PNG and then hangs; `control-astrojs screenshot` treats a non-empty file as success and kills the process.

Committed proofs live at `proof/public-home/` and `proof/auth-login/`. Later runs may overwrite a folder only when re-proving the same feature.

## Cleanup

```bash
.cursor/skills/verify-astrojs/bin/control-astrojs cleanup
```

Cleanup stops the app PID and the Strapi stub PID this launch started. It removes `/tmp/verify-astrojs/state`, `run.env`, cookie jars, and Chrome profiles. It never deletes `.cursor/skills/verify-astrojs/proof/`.

If launch failed halfway, run cleanup anyway. The state file records whatever was started.

## Helpers

`bin/control-astrojs` is executable. Invoke it from the repo root.

| Command | Purpose |
| --- | --- |
| `launch [--port N]` | Start the Strapi stub and isolated `astro dev`, write state, wait for `/login` |
| `doctor` | Read-only ownership + health check |
| `http GET PATH [--no-follow]` | Request against the owned origin |
| `screenshot --path FILE [--url /path]` | Headless Chrome PNG of a path |
| `drive public-home` | Scripted recipe + `proof/public-home/` |
| `drive auth-login` | Stub login round trip (guard, wrong password, login, dashboard, account, logout) + `proof/auth-login/`. Other feature IDs are driven with `http` from their feature file |
| `cleanup` | Tear down what this run started |
| `self-check` | CLI smoke (help + doctor-without-instance). Does not start the app |

`--json` on `doctor` and `launch` prints the state object.

Env the helper reads: `ASTROJS_VERIFY_PORT` (default `4331`), `ASTROJS_VERIFY_STUB_PORT` (default `4381`), `ASTROJS_VERIFY_TMP` (default `/tmp/verify-astrojs`), `ASTROJS_VERIFY_EVIDENCE_DIR` (default `<skill>/proof`).

## Isolation

Two verify stacks can run if ports differ (`ASTROJS_VERIFY_PORT`). Launch refuses a port that is already listening unless the recorded PID owns it. Do not drive a teammate's `:4321`. Do not write production secrets, DNS, Coolify, or SSH. Do not merge from this skill.

## Maintenance

Keep the map honest with `/maintain-verification-skill` as routes and copy change.
