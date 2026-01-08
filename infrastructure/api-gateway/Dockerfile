# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.19.0

FROM node:${NODE_VERSION}-bookworm AS base
WORKDIR /workspace
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable \
    && corepack prepare pnpm@9.1.0 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY infrastructure ./infrastructure
COPY docs ./docs
COPY tsconfig*.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm --filter './packages/**' build

FROM deps AS build
RUN pnpm --filter @transcendence/api-gateway build

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /workspace /workspace
CMD ["pnpm", "--filter", "@transcendence/api-gateway", "dev"]

FROM base AS prod
ENV NODE_ENV=production
WORKDIR /workspace/infrastructure/api-gateway
COPY --from=build /workspace/infrastructure/api-gateway/dist ./dist
COPY --from=build /workspace/packages /workspace/packages
COPY --from=deps /workspace/infrastructure/api-gateway/package.json ./
COPY --from=deps /workspace/node_modules ./node_modules
CMD ["node", "dist/server.js"]
