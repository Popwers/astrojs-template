# Register

Register is the `/register` form. A visitor enters an email and a password pair, lands on the mail-confirmation page that names their email, and can ask for the mail again. Profile setup is gated behind a session. The verify stack submits against the repo's Strapi stub, which accepts any email and sends no mail.

## Sub-features

- `register-load` serves `/register` with heading `S’inscrire`.
- `register-fields` shows `#email`, `#password`, `#passwordConfirmation`, the Turnstile block, and submit `S’inscrire`.
- `register-login-link` shows `Connectez-vous` to `/login`.
- `register-mail-gate` redirects `/register/mail-confirmation` to `/register` when cookie `mail-confirmation` is missing.
- `register-profile-gate` redirects logged-out `/register/profil` to `/login`.
- `register-submit` sets cookie `mail-confirmation` and redirects to `/register/mail-confirmation`.
- `register-mail-confirmation` shows `Confirmation de votre adresse email` and the submitted email.
- `register-resend` re-renders the mail-confirmation page with `A confirmation email has been sent to your email address.`

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/register`.
- Choose `S'inscrire` in the header after hydration.
- Follow `Inscrivez-vous` from `/login`.

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- No session or `mail-confirmation` cookies.
- Network access to `challenges.cloudflare.com` for the submits.

- **Open register.** Run `control-astrojs http GET /register --body artifacts/register.html`. Status is `200` and `cache-control=private, no-store`. The body contains `S’inscrire` (U+2019), `id="email"`, `id="password"`, `id="passwordConfirmation"`, `data-turnstile`, and `Connectez-vous`.
- **Mail gate.** Run `control-astrojs http GET /register/mail-confirmation --no-follow`. Status is `302` and `Location` is `/register`.
- **Profile gate.** Run `control-astrojs http GET /register/profil --no-follow`. Status is `302` and `Location` is `/login`.
- **Register, confirm, resend.** Run `control-astrojs drive auth-register`. It prints one line per step and writes `proof/auth-register/` (`steps.txt`, one `.headers` + `.html` per step, `doctor.txt`, `manifest.json`). Expected steps: `mail-gate` `302 /register`, `register-form` `200`, `register` `302 /register/mail-confirmation` with `mail-confirmation` set, `mail-confirmation` `200` with `verify-astrojs@example.com`, `resend-mail` `200` with `A confirmation email has been sent to your email address.`

## Gotchas

- The heading uses a typographic apostrophe (`S’inscrire`, U+2019). ASCII `S'inscrire` may miss in `grep -F`.
- Password fields come from `PasswordChecker` (`client:idle`). Ids are still in the SSR HTML.
- The password needs 8 characters with an upper-case letter, a lower-case letter, a digit, and a special character, and the confirmation must match. A weak password re-renders the form instead of redirecting.
- A submit without `cf-turnstile-response` is a 403 (`La vérification anti-robot a échoué`). Without network access to Cloudflare it is a 503.
- The stub stores nothing. A registered email cannot sign in afterwards; sign in with the stub reader through [Sign in](./auth-login.md).
- Register copy links to `/terms`, which has no page and 404s. That is a product gap, not a register-form failure.
- `/register/profil` is in `RESTRICTED_WHEN_LOGGED_OUT`. Anon users never see `Votre profil` / `Créer mon compte`.
- Register and resend each allow 5 POSTs per hour per client, in memory. `drive auth-register` spends 1 of each. Relaunch resets the buckets.
