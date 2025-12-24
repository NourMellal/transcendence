# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.18.1

FROM node:${NODE_VERSION}-bookworm AS base
WORKDIR /workspace
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable \
    && corepack prepare pnpm@9.1.0 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY docker/entrypoints /opt/entrypoints
RUN chmod +x /opt/entrypoints/*.sh

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY infrastructure ./infrastructure
RUN pnpm install --frozen-lockfile

FROM deps AS build
RUN pnpm --filter @transcendence/shared-validation build

FROM base AS dev
ENV NODE_ENV=development
ENTRYPOINT ["/opt/entrypoints/wait-for-pnpm.sh"]
CMD ["pnpm", "--filter", "@transcendence/shared-validation", "dev"]

FROM base AS prod
ENV NODE_ENV=production
WORKDIR /workspace/packages/shared-validation
COPY --from=build /workspace/packages/shared-validation/dist ./dist
COPY --from=deps /workspace/packages/shared-validation/package.json ./
COPY --from=deps /workspace/node_modules ./node_modules
CMD ["pnpm", "--filter", "@transcendence/shared-validation", "build"]
