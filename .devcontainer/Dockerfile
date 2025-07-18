FROM node:18-bullseye
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
RUN apt-get update && apt-get install -y sqlite3
WORKDIR /workspace
