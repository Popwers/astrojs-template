# Lost password

Lost password is the `/lost-password` form. A visitor can ask for a reset email. Wait-mail and reset are gated. Sending mail and completing a reset need a live Strapi and are not available on the verify stack.

## Sub-features

- `lost-load` serves `/lost-password` with heading `Vous avez oublié votre mot de passe ?`.
- `lost-fields` shows `#email` and submit `Réinitialiser mon mot de passe`.
- `lost-home-link` shows `Retour à l'accueil` to `/`.
- `lost-wait-gate` redirects `/lost-password/wait-mail` to `/lost-password` when cookie `wait-mail-password` is missing.
- `lost-reset-gate` redirects `/lost-password/reset` to `/lost-password` when cookie `password-reset-code` and `?code=` are missing.
- `lost-submit` is `verified-unreachable` without a real Strapi.

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/lost-password`.
- Follow `Mot de passe oublié ?` from `/login`.

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- No `wait-mail-password` or `password-reset-code` cookies.

- **Open form.** Run `control-astrojs http GET /lost-password`. Status is `200`. The body contains `Vous avez oublié votre mot de passe ?`, `id="email"`, and `Réinitialiser mon mot de passe`.
- **Wait-mail gate.** Run `control-astrojs http GET /lost-password/wait-mail --no-follow`. Status is `302` and `Location` is `/lost-password`.
- **Reset gate.** Run `control-astrojs http GET /lost-password/reset --no-follow`. Status is `302` and `Location` is `/lost-password`.
- **Submit.** Do not POST `actions.password.forgotPassword` on this stack. Report `lost-submit` as `verified-unreachable` (prerequisite: disposable Strapi that accepts the forgot-password endpoint). A successful submit would set cookie `wait-mail-password` and redirect to `/lost-password/wait-mail`.

## Gotchas

- `/lost-password/reset?code=<token>` sets cookie `password-reset-code` then redirects to `/lost-password/reset` without the query. Do not hit a real mailbox code on the verify stack.
- Layout mode `lost-password` shows `Retour à l'accueil`, same as login. Reset mode does not.
- Rate limits apply to forgot-password POSTs. Do not retry in a tight loop against a real API.
