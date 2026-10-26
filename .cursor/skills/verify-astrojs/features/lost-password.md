# Lost password

Lost password is the `/lost-password` form. A visitor asks for a reset email, lands on the wait-mail page that names their email, follows the mail link `/lost-password/reset?code=<token>`, and sets a new password, which signs them in. The verify stack submits against the repo's Strapi stub, which sends no mail and signs the reader in on reset without changing their password.

## Sub-features

- `lost-load` serves `/lost-password` with heading `Vous avez oublié votre mot de passe ?`.
- `lost-fields` shows `#email`, the Turnstile block, and submit `Réinitialiser mon mot de passe`.
- `lost-home-link` shows `Retour à l'accueil` to `/`.
- `lost-wait-gate` redirects `/lost-password/wait-mail` to `/lost-password` when cookie `wait-mail-password` is missing.
- `lost-reset-gate` redirects `/lost-password/reset` to `/lost-password` when cookie `password-reset-code` and `?code=` are missing.
- `lost-submit` sets cookie `wait-mail-password` and redirects to `/lost-password/wait-mail`, which shows `Email envoyé` and the submitted email.
- `lost-reset-code` turns the mail link `/lost-password/reset?code=<token>` into cookie `password-reset-code` and a 302 to `/lost-password/reset`.
- `lost-reset-form` shows `Changer votre mot de passe`, `#password`, `#passwordConfirmation`, and submit `Changer mon mot de passe`.
- `lost-reset-submit` signs the user in (`user_token`, `user_data`, `user_data_timestamp`), clears `password-reset-code`, and redirects to `/dashboard`.

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/lost-password`.
- Follow `Mot de passe oublié ?` from `/login`.
- Open the reset link from the mail (`/lost-password/reset?code=<token>`).

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- No session, `wait-mail-password`, or `password-reset-code` cookies.
- Network access to `challenges.cloudflare.com` for the submits.

- **Open form.** Run `control-astrojs http GET /lost-password`. Status is `200`. The body contains `Vous avez oublié votre mot de passe ?`, `id="email"`, `Réinitialiser mon mot de passe`, and `Retour à l'accueil`.
- **Wait-mail gate.** Run `control-astrojs http GET /lost-password/wait-mail --no-follow`. Status is `302` and `Location` is `/lost-password`.
- **Reset gate.** Run `control-astrojs http GET /lost-password/reset --no-follow`. Status is `302` and `Location` is `/lost-password`.
- **Reset link.** Run `control-astrojs http GET '/lost-password/reset?code=verify' --no-follow`. Status is `302` and `Location` is `/lost-password/reset`. A fake code is safe on the stub.
- **Forgot, reset, sign in.** Run `control-astrojs drive lost-password`. It prints one line per step and writes `proof/lost-password/` (`steps.txt`, one `.headers` + `.html` per step, `doctor.txt`, `manifest.json`). Expected steps: `wait-gate` `302 /lost-password`, `reset-gate` `302 /lost-password`, `forgot-form` `200`, `forgot` `302 /lost-password/wait-mail` with `wait-mail-password` set, `wait-mail` `200` with `Email envoyé`, `reset-link` `302 /lost-password/reset`, `reset-form` `200`, `reset` `302 /dashboard` with `user_token` set and `password-reset-code` cleared, `dashboard` `200` with `Jean Dupont`, `logout` `302 /login`.

## Gotchas

- `/lost-password/reset?code=<token>` sets cookie `password-reset-code` then redirects to `/lost-password/reset` without the query. Do not hit a real mailbox code on the verify stack.
- The stub's reset ignores the code and always signs in the reader. That proves the page flow, not code validation.
- The new password needs 8 characters with an upper-case letter, a lower-case letter, a digit, and a special character, and the confirmation must match.
- A submit without `cf-turnstile-response` is a 403 (`La vérification anti-robot a échoué`). Without network access to Cloudflare it is a 503.
- Layout mode `lost-password` shows `Retour à l'accueil`, same as login. Reset mode does not.
- Forgot-password and reset each allow 5 POSTs per hour per client, in memory. `drive lost-password` spends 1 of each. Relaunch resets the buckets.
