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
RUN pnpm --filter @transcendence/web build

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /workspace /workspace
CMD ["pnpm", "--filter", "@transcendence/web", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM nginx:1.27-alpine AS prod
WORKDIR /usr/share/nginx/html
COPY --from=build /workspace/apps/web/dist ./
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
