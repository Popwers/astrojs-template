# Legal pages

Legal pages are `/mentions-legales` and `/politique-confidentialite`, rendered on demand. A visitor can open them from the footer. Body copy comes from Strapi and is empty on the verify stack, whose stub answers CMS calls with a 404 envelope. The headings still render, and the legal notice always ends with a static `Hébergement` section naming the host, whatever Strapi answers.

## Sub-features

- `legal-mentions` serves `/mentions-legales` with `h1` `Mentions légales`.
- `legal-privacy` serves `/politique-confidentialite` with `h1` `Politique de confidentialité`.
- `legal-footer` reaches both URLs from the home footer.
- `legal-hosting` shows `h2` `Hébergement` and the host line starting `Hetzner Online GmbH` under the CMS body on `/mentions-legales` only.
- `legal-body` (the CMS part) is empty when Strapi has no content (`fetchApi` fallback). That is expected here, not a 500.

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/mentions-legales`.
- Open `http://127.0.0.1:4331/politique-confidentialite`.
- Follow `Mentions légales` or `Politique de confidentialité` in the footer on `/`.
- Follow `politique de confidentialité` inside the cookie-banner copy.

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- Strapi is the verify stub. CMS body copy is empty; the hosting section on `/mentions-legales` does not depend on it.

- **Mentions.** Run `control-astrojs http GET /mentions-legales --body artifacts/mentions.html`. Status is `200`, `cache-control=private, no-store` while the stub has no content. The markers contain `Mentions légales`; the saved HTML contains `>Hébergement</h2>` and `Hetzner Online GmbH`. Grep the closing form: under `astro dev` the opening tag carries `data-astro-source-*` attributes, so `<h2>Hébergement</h2>` never matches.
- **Privacy.** Run `control-astrojs http GET /politique-confidentialite --body artifacts/privacy.html`. Status is `200`. The body contains `Politique de confidentialité` and no `Hébergement` section.
- **Footer entry.** Run `control-astrojs http GET / --body artifacts/home.html`. The saved HTML contains `href="/mentions-legales"` and `href="/politique-confidentialite"`.
- **Empty CMS body.** Do not require Strapi rich text. A heading plus empty `TextRenderer` is a pass on `/politique-confidentialite`; on `/mentions-legales` the `Hébergement` section must still follow the empty body. A 500 is a product regression.

## Gotchas

- These pages render on demand (`prerender = false`) and call Strapi on every request, in dev and in a build. With content, an anonymous cookie-less 200 is cached at the edge (`Cache-Control: public, max-age=0, s-maxage=86400, stale-while-revalidate=604800`); a request carrying a session cookie, or an empty body as on the verify stub, answers `Cache-Control: private, no-store` so an empty page is never cached. Verify `STRAPI_URL` must answer fast on loopback so the 30s fetch timeout does not hang; a public placeholder host can stall the request.
- `/terms` is not a legal page. Register links to it; it 404s.
- Cookie-banner copy links to `/politique-confidentialite` even when the banner is not visible.
