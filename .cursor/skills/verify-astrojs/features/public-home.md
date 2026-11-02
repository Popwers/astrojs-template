# Public home

Public home is the prerendered welcome page at `/`. A visitor sees the Astro hero, site chrome, cookie-banner markup, and can reach login, register, and legal pages. A missing route shows the custom 404.

## Sub-features

- `home-load` serves `/` with HTTP 200.
- `home-identity` shows the hero heading `Welcome to Astro` (the `h1` wraps `Astro` in a `text-gradient` span; the contiguous string in the HTML is the instructions paragraph under it).
- `home-nav` shows `Accueil` linking to `/`.
- `home-footer-legal` shows `Mentions légales` and `Politique de confidentialité`.
- `home-cookie-markup` includes `#cookie-banner`, `#accept-all-cookies`, `#customize-cookies`, and the `#cookie-modal` layer.
- `home-404` serves a missing path with heading `Page non trouvée`.

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/` in a browser.
- Follow `Retour à l'accueil` from `/login` or `/lost-password`.
- Follow `Retourner à l'accueil` from a 404 page.
- Open a path that has no page (404).

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- No session cookies. Nav placeholders `/menu1` and `/menu2` 404; that is expected.

- **Open home.** Run `control-astrojs http GET /`. Status is `200`. The body contains `Welcome to Astro`.
- **See chrome.** The same HTML contains `Accueil`, `Mentions légales`, and `Politique de confidentialité`.
- **See cookie markup.** The same HTML contains `id="cookie-banner"`, `id="accept-all-cookies"`, `id="customize-cookies"`, and `id="cookie-modal"` (grep the `--body` file for the last two; `http` prints only its fixed markers). The banner uses `.cookie-layer { opacity: 0 }` until client JS adds `is-visible`; HTTP proof is the markup, not visibility.
- **Missing route.** Run `control-astrojs http GET /this-page-does-not-exist-verify`. Status is `404`. The body contains `Page non trouvée` and `Retourner à l'accueil`.
- **Painted frame.** Run `control-astrojs screenshot --path .cursor/skills/verify-astrojs/proof/public-home/home.png --url /`. The PNG shows `Welcome to Astro`. On a host where headless Chrome cannot paint at all (no PNG even for a `data:` URL), report the frame unreachable with that prerequisite; the committed `home.png` stays, a failed shot never removes it.
- **Scripted recipe.** Run `control-astrojs drive public-home`. It writes `proof/public-home/` (`home.html`, `home.headers`, `not-found.html`, `doctor.txt`, `manifest.json`, and `home.png` when Chrome exists).

## Gotchas

- A 200 with an error shell is not proof. Assert `Welcome to Astro`, not only the status.
- `localhost:4321` is the human dev port. Doctor must name 4331 (or the port this launch recorded).
- `AvatarIsland` is `server:defer`. First-paint `GET /` often omits `Se connecter` / `S'inscrire`. Do not fail home because those strings are missing; prove them on `/login` and `/register`.
- The document title is `Your project | Accueil` (`og:title` is the bare `Accueil`). The `h1` is `Welcome to <span class="text-gradient">Astro</span>`: grep `Welcome to <span` for the heading itself. The plain `Welcome to Astro` marker that `http` and doctor print matches the instructions paragraph under the heading, so a template that drops that paragraph needs the heading grep.
- Cookie-banner copy is in the HTML on every `BaseLayout` page. Hide is `.cookie-layer { opacity: 0 }`, not a Tailwind `opacity-0` class on the banner. Do not require a painted banner for this feature.
- `/menu1` and `/menu2` are nav labels only. They 404. That is not a home regression.
