# astrojs-template verification map

This directory is the maintained source for verifying the user-facing behavior of the Astro starter template. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `.cursor/skills/verify-astrojs/bin/control-astrojs launch`.
- Default URL is `http://127.0.0.1:4331`. There is no local database.
- Run `control-astrojs doctor` and require `owned` health: `/login` `< 500` with `Se connecter`, `/` `200` with `Welcome to Astro`.
- `COOKIE_SIGNING_SECRET` is a generated verify secret. `STRAPI_URL` is `http://127.0.0.1:1` (closed). Auth POSTs that need Strapi are unreachable.
- Never drive an instance this run did not start. Do not use `localhost:4321` unless doctor says that URL is ours.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer HTTP (`control-astrojs http`) for status, redirects, and HTML markers.
- Use `control-astrojs screenshot` when the proof needs a painted frame.
- Prefer labels, ids, and the handles in the parent `SKILL.md` over CSS or coordinates.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Do not POST login, register, or password-reset against a remote Strapi. Report those paths `verified-unreachable`.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes the HTML and, when Chrome is present, a screenshot with page identity visible.
- HTTP proof includes method, URL, status, and the body or redirect target.
- Mutation proof includes a second read of the stored value. Login/register mutations have no second view on this stack.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet prerequisite.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-astrojs` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Public home](./public-home.md) covers `/`, the welcome hero, nav/footer chrome, cookie-banner markup, and the 404 page.
- [Sign in](./auth-login.md) covers `/login` and logged-out redirects into it.
- [Register](./auth-register.md) covers `/register` and the mail-confirmation / profile gates.
- [Lost password](./lost-password.md) covers `/lost-password` and the wait-mail / reset gates.
- [Legal pages](./legal-pages.md) covers `/mentions-legales` and `/politique-confidentialite`.

## Not yet mapped (reachable, no recipe)

These user-facing paths exist. They are not a pass for any feature above. Do not invent recipes mid-run.

- `/dashboard` and `/dashboard/account` **after a real Strapi session** (anon access is covered by [Sign in](./auth-login.md))
- `/register/mail-confirmation` and `/register/profil` **with the required cookies / session**
- `/lost-password/wait-mail` and `/lost-password/reset` **with the required cookies / `?code=`**
- Cookie-banner accept / customize clicks (markup is covered on public home; visibility needs hydration)
- PWA install / service worker (`/manifest.webmanifest`, `src/sw.ts`)
- `/robots.txt` and `/sitemap-index.xml`

`/terms` is linked from register copy and has no page. Hitting it is a 404, not a mapped legal page.
