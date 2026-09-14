# Legal pages

Legal pages are prerendered `/mentions-legales` and `/politique-confidentialite`. A visitor can open them from the footer. Body copy comes from Strapi and is empty on the verify stack; the headings still render.

## Sub-features

- `legal-mentions` serves `/mentions-legales` with `h1` `Mentions légales`.
- `legal-privacy` serves `/politique-confidentialite` with `h1` `Politique de confidentialité`.
- `legal-footer` reaches both URLs from the home footer.
- `legal-body` is empty when Strapi is down (`fetchApi` fallback). That is expected here, not a 500.

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/mentions-legales`.
- Open `http://127.0.0.1:4331/politique-confidentialite`.
- Follow `Mentions légales` or `Politique de confidentialité` in the footer on `/`.
- Follow `politique de confidentialité` inside the cookie-banner copy.

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- Strapi is the closed verify URL. Body copy may be empty.

- **Mentions.** Run `control-astrojs http GET /mentions-legales`. Status is `200`. The body contains `Mentions légales`.
- **Privacy.** Run `control-astrojs http GET /politique-confidentialite`. Status is `200`. The body contains `Politique de confidentialité`.
- **Footer entry.** Run `control-astrojs http GET /`. The home HTML contains `href="/mentions-legales"` and `href="/politique-confidentialite"`.
- **Empty CMS body.** Do not require Strapi rich text. A heading plus empty `TextRenderer` is a pass on this stack. A 500 is a product regression.

## Gotchas

- These pages `prerender = true` and call Strapi at render. Verify `STRAPI_URL` must be a closed local port so the 30s fetch timeout does not hang. Connection refused is immediate; a public placeholder host can stall the request.
- `/terms` is not a legal page. Register links to it; it 404s.
- Cookie-banner copy links to `/politique-confidentialite` even when the banner is not visible.
