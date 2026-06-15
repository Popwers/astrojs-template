# Error-handling contract

This template uses three deliberately different error styles, one per layer.
They are not inconsistencies to be unified — each fits its layer's failure
mode. This document states which style applies where so a contributor can tell,
at a glance, what a new code path should do.

## The three styles

### 1. Actions — always throw `ActionError`

Action handlers (`src/actions/**`) talk to Strapi through
`scopedRequest` (`src/actions/utility/scopedRequest.ts`). That helper:

- calls `submitApi`, then inspects the result for an `error` field;
- on a Strapi error, throws an `ActionError`, mapping the Strapi status/name to
  an Astro action code (`ForbiddenError` → `FORBIDDEN`, otherwise
  `BAD_REQUEST`), and appending `details` to the message when present;
- in its `catch`, re-throws as `ActionError`, translating the message through
  `src/actions/utility/translation.json` (`TRANSLATIONS`) into a French,
  user-facing string, with a French fallback when the message is unknown.

Authentication is enforced by `requireAuth` (`src/lib/authGuard.ts`), which
throws `ActionError({ code: 'UNAUTHORIZED' })` when `context.locals.user` or
`context.locals.userToken` is missing. Call it at the top of any handler that
requires a session.

**Rule for new actions:** never return an error shape; throw `ActionError`.
Go through `scopedRequest` so the status→code mapping and translation happen in
one place. Guard mutating handlers with `requireAuth` and derive ownership ids
from `context.locals`, never from client input.

### 2. Pages fetching content — silent fallback by design

`fetchApi` (`src/lib/strapi.ts`, the default export) is used by `.astro` pages
to render content. Its `returnError` flag decides what happens on failure:

- `returnError: false` (the default) → on any failure (non-OK status, non-JSON
  body, thrown fetch) it logs to the console and returns a **safe empty
  fallback** built by `createFetchFallback` (an empty array or object shaped by
  `wrappedByKey` / `wrappedByList`). The page renders with empty content rather
  than crashing.
- `returnError: true` → on failure it returns the **structured Strapi error**
  (`{ error: { status, name, message, details } }`) instead of the fallback.
  The caller must then handle the `'error' in result` branch itself.

The silent-fallback default is an **availability trade-off, stated explicitly**:
a broken or slow CMS must not turn every content page into a 500. The cost is
that a persistent CMS outage degrades quietly — empty sections, logged but not
surfaced to the visitor. This is the intended behavior for content pages; do
not "fix" it by making `fetchApi` throw.

**Rule for new page fetches:** use the default (`returnError: false`) for
content a page can render empty. Use `returnError: true` only when the page
needs to *react* to the error (redirect, show a message, pick a fallback view),
and then handle the `'error' in result` branch.

`submitApi` (named export) is the write-side counterpart: it **never throws** —
it always returns either the payload or a normalized Strapi error
(`createStrapiError`/`normalizeStrapiError`), including `502` for a non-JSON
success body and `500` for a thrown fetch. It is consumed by `scopedRequest`,
which is what converts those error shapes into thrown `ActionError`s (style 1).

### 3. Middleware — never throw, keep serving

`userDataHydratation.ts` refreshes the session on a cookie timestamp. A
middleware that threw would 500 *every* route, so it never does:

- The outer `try/catch` in `hydrateUserData` logs and falls through to `next()`
  — a broken refresh must not take down the page being requested.
- In `refreshUserData`, a `401` ends the session (`clearUserSession` + redirect
  to `/login`): the token is no longer valid, so there is nothing to serve.
- Any **other** error (non-401) only logs and returns: the existing (stale)
  cookie data keeps serving the request. This is deliberate — a transient CMS
  blip should not log the user out. The cost is the same as style 2: a
  *persistent* refresh failure degrades quietly (stale session data, logged but
  not surfaced). See "Observability gap" below.
- An incomplete payload (`!isPersistableUser`) is also a silent skip: we keep
  the prior cookie rather than overwrite it with a partial user.

**Rule for new middleware:** never throw out of middleware; log and continue,
or end the session deliberately on an auth failure.

## Which style do I use?

| You are writing… | Failure should… | Use |
|------------------|-----------------|-----|
| An action handler (mutation or authed read) | surface a typed, translated error to the user | throw `ActionError` via `scopedRequest`; guard with `requireAuth` |
| A page fetch for content that can render empty | degrade silently, page still renders | `fetchApi` with `returnError: false` (default) |
| A page fetch where the page must react to errors | be inspected by the caller | `fetchApi` with `returnError: true`, handle `'error' in result` |
| A write to Strapi from an action | be normalized, then thrown upstream | `submitApi` (returns error shape) → `scopedRequest` (throws) |
| Middleware (session, redirects, hydration) | never 500 the route | log + `next()`, or end session on 401 |

## Observability gap (known, intentional for now)

The two silent paths — `fetchApi`'s `returnError: false` fallback and
`refreshUserData`'s non-401 branch — only `console.error`. A persistent backend
outage is therefore visible in server logs but not in monitoring.

Sentry is wired for the server runtime (`@sentry/astro` in `astro.config.mjs`
+ `sentry.server.config.js`), but only initializes when `SENTRY_DSN` is set in
production. Promoting these logged failures to `Sentry.captureException` is a
reasonable future hardening step; it was intentionally **not** done here to
avoid importing the Sentry SDK into a hot middleware path that runs under both
test runners. If the team later decides silent fallbacks should raise
monitoring signals, this is the place that decision gets recorded, and the
middleware tests (which assert `next()` is still called) are what must stay
green.
