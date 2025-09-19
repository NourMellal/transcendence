FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package.json files for all workspaces
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY services/user-service/package.json ./services/user-service/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-validation/package.json ./packages/shared-validation/

# Install dependencies
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/user-service/node_modules ./services/user-service/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules
COPY --from=deps /app/packages/shared-validation/node_modules ./packages/shared-validation/node_modules

COPY . .
RUN pnpm --filter "@transcendence/user-service" build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3001

COPY --from=builder /app/services/user-service/dist ./dist
COPY --from=builder /app/services/user-service/package.json ./package.json
COPY --from=deps /app/services/user-service/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/infrastructure/fastify/server.js"]
