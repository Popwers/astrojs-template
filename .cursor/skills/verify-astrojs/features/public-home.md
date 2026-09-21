# Public home

Public home is the prerendered welcome page at `/`. A visitor sees the Astro hero, site chrome, cookie-banner markup, and can reach login, register, and legal pages. A missing route shows the custom 404.

## Sub-features

- `home-load` serves `/` with HTTP 200.
- `home-identity` shows `Welcome to Astro`.
- `home-nav` shows `Accueil` linking to `/`.
- `home-footer-legal` shows `Mentions légales` and `Politique de confidentialité`.
- `home-cookie-markup` includes `#cookie-banner` and `#accept-all-cookies`.
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
- **See cookie markup.** The same HTML contains `id="cookie-banner"` and `id="accept-all-cookies"`. The banner uses `.cookie-layer { opacity: 0 }` until client JS adds `is-visible`; HTTP proof is the markup, not visibility.
- **Missing route.** Run `control-astrojs http GET /this-page-does-not-exist-verify`. Status is `404`. The body contains `Page non trouvée` and `Retourner à l'accueil`.
- **Painted frame.** Run `control-astrojs screenshot --path .cursor/skills/verify-astrojs/proof/public-home/home.png --url /`. The PNG shows `Welcome to Astro`.
- **Scripted recipe.** Run `control-astrojs drive public-home`. It writes `proof/public-home/` (`home.html`, `home.headers`, `not-found.html`, `doctor.txt`, `manifest.json`, and `home.png` when Chrome exists).

## Gotchas

- A 200 with an error shell is not proof. Assert `Welcome to Astro`, not only the status.
- `localhost:4321` is the human dev port. Doctor must name 4331 (or the port this launch recorded).
- `AvatarIsland` is `server:defer`. First-paint `GET /` often omits `Se connecter` / `S'inscrire`. Do not fail home because those strings are missing; prove them on `/login` and `/register`.
- The home title uses `Acceuil` (source typo). Assert that spelling, or ignore the title and assert the `h1`.
- Cookie-banner copy is in the HTML on every `BaseLayout` page. Hide is `.cookie-layer { opacity: 0 }`, not a Tailwind `opacity-0` class on the banner. Do not require a painted banner for this feature.
- `/menu1` and `/menu2` are nav labels only. They 404. That is not a home regression.
