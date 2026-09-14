# Register

Register is the `/register` form. A visitor can open it and see email plus password fields. Mail confirmation and profile setup are gated. Completing a registration needs a live Strapi and is not available on the verify stack.

## Sub-features

- `register-load` serves `/register` with heading `S’inscrire`.
- `register-fields` shows `#email`, `#password`, `#passwordConfirmation`, and submit `S’inscrire`.
- `register-login-link` shows `Connectez-vous` to `/login`.
- `register-mail-gate` redirects `/register/mail-confirmation` to `/register` when cookie `mail-confirmation` is missing.
- `register-profile-gate` redirects logged-out `/register/profil` to `/login`.
- `register-submit` is `verified-unreachable` without a real Strapi.

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/register`.
- Choose `S'inscrire` in the header after hydration.
- Follow `Inscrivez-vous` from `/login`.

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- No session or `mail-confirmation` cookies.

- **Open register.** Run `control-astrojs http GET /register`. Status is `200`. The body contains `S’inscrire` (U+2019), `id="email"`, `id="password"`, `id="passwordConfirmation"`, and `Connectez-vous`.
- **Mail gate.** Run `control-astrojs http GET /register/mail-confirmation --no-follow`. Status is `302` and `Location` is `/register`.
- **Profile gate.** Run `control-astrojs http GET /register/profil --no-follow`. Status is `302` and `Location` is `/login`.
- **Submit.** Do not POST `actions.auth.register` on this stack. Report `register-submit` as `verified-unreachable` (prerequisite: disposable Strapi). A successful register would set cookie `mail-confirmation` and redirect to `/register/mail-confirmation`.

## Gotchas

- The heading uses a typographic apostrophe (`S’inscrire`, U+2019). ASCII `S'inscrire` may miss in `grep -F`.
- Password fields come from `PasswordChecker` (`client:idle`). Ids are still in the SSR HTML.
- Register copy links to `/terms`, which has no page and 404s. That is a product gap, not a register-form failure.
- `/register/profil` is in `RESTRICTED_WHEN_LOGGED_OUT`. Anon users never see `Votre profil` / `Créer mon compte`.
- Rate limit is 5 register POSTs per hour per client. Do not hammer the action even against a real Strapi.
