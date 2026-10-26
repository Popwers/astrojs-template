# Sign in

Sign in is the `/login` form. A visitor can open it, see the email and password fields, and is sent here when they hit an account route while logged out. A signed-in visitor lands on the `/dashboard` account page, can open `/dashboard/account`, and can sign out. The verify stack signs in against the repo's Strapi stub.

## Sub-features

- `login-load` serves `/login` with heading `Se connecter`.
- `login-fields` shows `#email`, `#password`, and submit `Se connecter`.
- `login-register-link` shows `Inscrivez-vous` to `/register`.
- `login-forgot-link` shows `Mot de passe oublié ?` to `/lost-password`.
- `login-home-link` shows `Retour à l'accueil` to `/`.
- `login-guard` redirects logged-out `/dashboard`, `/dashboard/account`, and `/register/profil` to `/login`.
- `login-turnstile` rejects a submit without a Turnstile token with status `403` and `La vérification anti-robot a échoué`.
- `login-wrong-password` re-renders `/login` with status `400` and `Adresse email ou mot de passe incorrect`.
- `login-submit` signs the stub reader in and redirects to `/dashboard` (`Mon compte`, name, email, `Se déconnecter`).
- `login-account` serves `/dashboard/account` with heading `Mon profil` to a signed-in user.
- `login-logged-in-gate` redirects a signed-in `/login` to `/dashboard`.
- `login-logout` signs out to `/login`; `/dashboard` is gated again afterwards.

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/login`.
- Choose `Se connecter` in the header after hydration.
- Open `/dashboard`, `/dashboard/account`, or `/register/profil` while logged out.

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- No `user_token` / `user_data` cookies.

- **Open login.** Run `control-astrojs http GET /login`. Status is `200`. The body contains `Se connecter`, `id="email"`, `id="password"`, `Mot de passe oublié ?`, `Inscrivez-vous`, and `Retour à l'accueil`.
- **Guard dashboard.** Run `control-astrojs http GET /dashboard --no-follow`. Status is `302` and `Location` is `/login`.
- **Guard account.** Run `control-astrojs http GET /dashboard/account --no-follow`. Status is `302` and `Location` is `/login`.
- **Guard profile setup.** Run `control-astrojs http GET /register/profil --no-follow`. Status is `302` and `Location` is `/login`.
- **Painted frame.** Run `control-astrojs screenshot --path artifacts/login.png --url /login`. The PNG shows `Se connecter`.
- **Sign in, browse, sign out.** Run `control-astrojs drive auth-login`. It prints one line per step and writes `proof/auth-login/` (`steps.txt`, one `.headers` + `.html` per step, `doctor.txt`, `manifest.json`). Expected steps: `guard` `302 /login`, `turnstile-missing` `403`, `wrong-password` `400`, `login` `302 /dashboard` with `user_token`, `user_data`, `user_data_timestamp` set, `dashboard` `200` with `Mon compte` and `Jean Dupont`, `account` `200` with `Mon profil`, `login-when-logged-in` `302 /dashboard`, `logout` `302 /login`, `guard-after-logout` `302 /login`. A 200 HTML form after the login POST is not a successful login.

## Gotchas

- Docker health is `GET /api/health` (200 `ok`, plain text). Doctor probes `/login` instead, so a healthy `/api/health` does not prove the sign-in page.
- The form holds a Turnstile widget (`data-turnstile`). A POST without `cf-turnstile-response` is a 403 before Strapi is called. `drive auth-login` sends Cloudflare's dummy token, which the always-pass test secret accepts at siteverify; that needs network access to `challenges.cloudflare.com`, or the submit answers 503 with `La vérification anti-robot est indisponible`, not a pass or a wrong password.
- `/login`, `/dashboard`, and their redirects answer `Cache-Control: private, no-store`.
- `PasswordInput` is a React island (`client:idle`). `#password` is in the SSR HTML.
- Submit is a React island. The accessible name is the `label` prop `Se connecter`.
- Query `?error=server-unavailable` shows `Le serveur ne répond pas pour le moment` without submitting.
- A successful login sets `user_token`, `user_data`, and `user_data_timestamp`, then redirects to `/dashboard` (or a `?redirect=` path starting with a single `/`). There is no Better Auth cookie.
- Action POSTs (`/login?_action=auth.login`, `/dashboard?_action=auth.logout`) need `Origin` equal to the app origin. Without it Astro answers `403`.
- Login allows 10 POSTs per 15 minutes per client, in memory, counted before the Turnstile check. `drive auth-login` spends 3. Relaunch resets the bucket.
- Only the stub accounts in `tests/e2e/accounts.ts` sign in. Use the reader; the e2e suite renames the editor.
- Do not follow redirects when proving the guard. `http GET /dashboard` without `--no-follow` lands on `/login` `200` and hides the 302.
