# Sign in

Sign in is the `/login` form. A visitor can open it, see the email and password fields, and is sent here when they hit an account route while logged out. A signed-in visitor lands on the `/dashboard` account page, can open `/dashboard/account`, and can sign out. The verify stack signs in against the repo's Strapi stub.

## Sub-features

- `login-load` serves `/login` with heading `Se connecter`.
- `login-fields` shows `#email`, `#password`, and submit `Se connecter`.
- `login-register-link` shows `Inscrivez-vous` to `/register`.
- `login-forgot-link` shows `Mot de passe oublié ?` to `/lost-password`.
- `login-home-link` shows `Retour à l'accueil` to `/`.
- `login-guard` redirects logged-out `/dashboard`, `/dashboard/account`, and `/register/profil` to `/login`.
- `login-turnstile` refuses a login POST without a Turnstile token with status `403` and `La vérification anti-robot a échoué`, before Strapi is called.
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
- **Sign in, browse, sign out.** Run `control-astrojs drive auth-login`. It prints one line per step and writes `proof/auth-login/` (`steps.txt`, one `.headers` + `.html` per step, `doctor.txt`, `manifest.json`). Expected steps: `guard` `302 /login`, `no-turnstile` `403`, `wrong-password` `400`, `login` `302 /dashboard` with `user_token`, `user_data`, `user_data_timestamp` set, `dashboard` `200` with `Mon compte` and `Jean Dupont`, `account` `200` with `Mon profil`, `login-when-logged-in` `302 /dashboard`, `logout` `302 /login`, `guard-after-logout` `302 /login`. The `wrong-password` and `login` POSTs carry `cf-turnstile-response=XXXX.DUMMY.TOKEN.XXXX`; the server verifies it at `challenges.cloudflare.com` with the test secret, so the drive needs network. A 200 HTML form after the login POST is not a successful login.

## Gotchas

- Docker health is `GET /login` status `< 500`, not a JSON health endpoint.
- `PasswordInput` is a React island (`client:idle`). `#password` is in the SSR HTML.
- Submit is a React island. The accessible name is the `label` prop `Se connecter`.
- Query `?error=server-unavailable` shows `Le serveur ne répond pas pour le moment` without submitting.
- A successful login sets `user_token`, `user_data`, and `user_data_timestamp`, then redirects to `/dashboard` (or a `?redirect=` path starting with a single `/`). There is no Better Auth cookie.
- Action POSTs (`/login?_action=auth.login`, `/dashboard?_action=auth.logout`) need `Origin` equal to the app origin. Without it Astro answers `403`.
- Login allows 10 POSTs per 15 minutes per client, in memory. The limit is checked before Turnstile, so every POST counts. `drive auth-login` spends 3. Relaunch resets the bucket.
- Every login POST needs a non-empty `cf-turnstile-response`. Without the field the action answers `403` (`La vérification anti-robot a échoué`); with launch's test secret any non-empty token passes. If `challenges.cloudflare.com` is unreachable, the action answers `503` (`La vérification anti-robot est indisponible`), not a pass or a wrong password.
- Only the stub accounts in `tests/e2e/accounts.ts` sign in. Use the reader; the e2e suite renames the editor.
- Do not follow redirects when proving the guard. `http GET /dashboard` without `--no-follow` lands on `/login` `200` and hides the 302.
