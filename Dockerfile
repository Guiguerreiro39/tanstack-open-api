FROM node:24-slim AS base
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN CI=true pnpm install --frozen-lockfile

FROM deps AS build
ARG VITE_API_URL=""
ARG VITE_SENTRY_DSN=""
ARG VITE_DD_APPLICATION_ID=""
ARG VITE_DD_CLIENT_TOKEN=""
ARG VITE_DD_SITE="datadoghq.com"
ARG VITE_APP_VERSION="0.1.0"
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_DD_APPLICATION_ID=$VITE_DD_APPLICATION_ID \
    VITE_DD_CLIENT_TOKEN=$VITE_DD_CLIENT_TOKEN \
    VITE_DD_SITE=$VITE_DD_SITE \
    VITE_APP_VERSION=$VITE_APP_VERSION

COPY tsconfig.json vite.config.ts orval.config.ts openapi.json ./
COPY public ./public
COPY src ./src
RUN pnpm generate:api && pnpm build && rm -f dist/**/*.map

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN CI=true pnpm install --prod --frozen-lockfile --ignore-scripts

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

RUN chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server.mjs package.json ./

USER node
EXPOSE 3000

CMD ["node", "server.mjs"]
