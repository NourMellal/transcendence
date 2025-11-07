FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml* ./
COPY services/user-service/package.json ./services/user-service/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-validation/package.json ./packages/shared-validation/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/user-service/node_modules ./services/user-service/node_modules

# Copy source code
COPY packages ./packages
COPY services/user-service ./services/user-service
COPY tsconfig.json ./

# Build TypeScript (if you add a build script)
# For now, we'll use tsx in production (not recommended but works)
WORKDIR /app/services/user-service

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Install production dependencies only
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for production install
COPY --from=deps /app/package.json /app/pnpm-lock.yaml ./
COPY --from=deps /app/services/user-service/package.json ./services/user-service/
COPY --from=deps /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=deps /app/packages/shared-utils/package.json ./packages/shared-utils/
COPY --from=deps /app/packages/shared-validation/package.json ./packages/shared-validation/

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/user-service/src ./services/user-service/src
COPY --from=builder /app/services/user-service/tsconfig.json ./services/user-service/
COPY --from=builder /app/tsconfig.json ./

# Create necessary directories
RUN mkdir -p /app/services/user-service/data && \
    chown -R node:node /app

# Switch to non-root user
USER node

WORKDIR /app/services/user-service

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tsx to run TypeScript directly
CMD ["npx", "tsx", "src/server.ts"]