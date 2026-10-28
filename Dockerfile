# syntax=docker/dockerfile:1

# --- base: minimal runtime image (alpine + bun) ------------------------------
FROM popwers/mini-bun:latest AS base
WORKDIR /app
RUN apk add --no-cache libstdc++

# --- deps: prod-only node_modules, bun cache mounted across builds -----------
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked \
    bun install --production --frozen-lockfile

# --- build: full install (incl. devDeps), transpile + bundle -----------------
# Starts from `base`, not `deps`: the build needs devDependencies (the Tailwind
# and PWA Vite integrations, the SCSS compiler, type tooling, etc.) which `deps`
# omits via `--production`. Keeping these out of the `deps` tree is what keeps the
# runtime image lean — `runtime` copies node_modules from `deps`, never from here.
FROM base AS build
# SENTRY_AUTH_TOKEN is a BuildKit secret on the build RUN only. It is never an
# ARG or ENV, so it cannot persist in image layers or `docker history`.
ARG SOURCE_COMMIT
ARG PUBLIC_SENTRY_DSN
ARG SENTRY_TRACES_SAMPLE_RATE
ENV SENTRY_RELEASE=$SOURCE_COMMIT \
    PUBLIC_SENTRY_DSN=$PUBLIC_SENTRY_DSN \
    SENTRY_TRACES_SAMPLE_RATE=$SENTRY_TRACES_SAMPLE_RATE
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile
COPY . .
# Prerendering loads astro:env/server, which reads every required secret as it loads. Build-only
# placeholders satisfy it: `access: 'secret'` values are read again at runtime, never inlined, and no
# prerendered page renders them. `bun --bun` runs Astro and Vite under Bun.
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked \
    --mount=type=secret,id=SENTRY_AUTH_TOKEN,env=SENTRY_AUTH_TOKEN,required=false \
    COOKIE_SIGNING_SECRET=build-only TURNSTILE_SITE_KEY=build-only TURNSTILE_SECRET_KEY=build-only \
    bun --bun run build

# --- runtime: ship only node_modules + dist + entry -------------------------
FROM base AS runtime
ENV HOST=0.0.0.0 \
    PORT=4321 \
    NODE_ENV=production

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist          ./dist
COPY start.mjs ./start.mjs
COPY server ./server

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER bun
# start.mjs drains in-flight requests on SIGTERM and exits within SHUTDOWN_TIMEOUT_MS (8 s), under
# the 10 s Docker / Coolify wait before SIGKILL. Bun as PID 1 gets no default SIGTERM action.
STOPSIGNAL SIGTERM
CMD ["bun", "./start.mjs"]
