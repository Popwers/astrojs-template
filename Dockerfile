# syntax=docker/dockerfile:1.7

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
# Sentry build-time inputs (passed by the CI/CD platform as build args).
# SENTRY_AUTH_TOKEN uploads source maps; SOURCE_COMMIT becomes the release name
# so errors map to the deployed commit.
# Both optional: the build still succeeds without them (no upload, no release).
ARG SENTRY_AUTH_TOKEN
ARG SOURCE_COMMIT
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    SENTRY_RELEASE=$SOURCE_COMMIT
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile
COPY . .
RUN bun run build

# --- runtime: ship only node_modules + dist + entry -------------------------
FROM base AS runtime
ENV HOST=0.0.0.0 \
    PORT=4321 \
    NODE_ENV=production

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist          ./dist
COPY start.mjs ./start.mjs

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "./start.mjs"]
