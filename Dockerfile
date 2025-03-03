FROM node:lts-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache libstdc++ curl && \
    npm config set audit false && \
    npm config set fund false && \
    npm config set update-notifier false

FROM base AS prod-deps
RUN npm ci --omit=dev --prefer-offline --no-audit

FROM prod-deps AS build
COPY . .
RUN node --run build

FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/.env ./

ENV HOST=0.0.0.0 PORT=4321
EXPOSE 4321

CMD ["node", "--require", "dotenv/config", "./dist/server/entry.mjs"]
