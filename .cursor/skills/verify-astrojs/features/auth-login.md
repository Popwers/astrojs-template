# Sign in

Sign in is the `/login` form. A visitor can open it, see the email and password fields, and is sent here when they hit an account route while logged out. Completing a login needs a live Strapi and is not available on the verify stack.

## Sub-features

- `login-load` serves `/login` with heading `Se connecter`.
- `login-fields` shows `#email`, `#password`, and submit `Se connecter`.
- `login-register-link` shows `Inscrivez-vous` to `/register`.
- `login-forgot-link` shows `Mot de passe oublié ?` to `/lost-password`.
- `login-home-link` shows `Retour à l'accueil` to `/`.
- `login-guard` redirects logged-out `/dashboard`, `/dashboard/account`, and `/register/profil` to `/login`.
- `login-submit` is `verified-unreachable` without a real Strapi.

## How to get to it (user POV)

- Open `http://127.0.0.1:4331/login`.
- Choose `Se connecter` in the header after hydration.
- Open `/dashboard`, `/dashboard/account`, or `/register/profil` while logged out.

## Driving it with control-astrojs

Preconditions:

- `control-astrojs doctor` reports the owned URL.
- No `user_token` / `user_data` cookies.

- **Open login.** Run `control-astrojs http GET /login`. Status is `200`. The body contains `Se connecter`, `id="email"`, `id="password"`, `Mot de passe oublié ?`, and `Inscrivez-vous`.
- **Guard dashboard.** Run `control-astrojs http GET /dashboard --no-follow`. Status is `302` and `Location` is `/login`.
- **Guard account.** Run `control-astrojs http GET /dashboard/account --no-follow`. Status is `302` and `Location` is `/login`.
- **Guard profile setup.** Run `control-astrojs http GET /register/profil --no-follow`. Status is `302` and `Location` is `/login`.
- **Painted frame.** Run `control-astrojs screenshot --path artifacts/login.png --url /login`. The PNG shows `Se connecter`.
- **Submit.** Do not POST `actions.auth.login` on this stack. Report `login-submit` as `verified-unreachable` (prerequisite: a local or disposable Strapi with a test user). A 200 HTML form is not a successful login.

## Gotchas

- Docker health is `GET /login` status `< 500`, not a JSON health endpoint.
- `PasswordInput` is a React island (`client:idle`). `#password` is in the SSR HTML.
- Submit is a React island. The accessible name is the `label` prop `Se connecter`.
- Query `?error=server-unavailable` shows `Le serveur ne répond pas pour le moment` without submitting.
- A successful login sets `user_token` and `user_data` then redirects to `/dashboard` (or a same-origin `?redirect=` path). There is no Better Auth cookie.
- Do not follow redirects when proving the guard. `http GET /dashboard` without `--no-follow` lands on `/login` `200` and hides the 302.
