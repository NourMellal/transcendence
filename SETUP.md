# Project Setup Guide

## Prerequisites
- Docker and Docker Compose
- Node.js 18+ and pnpm
- Vault container running

## Quick Start

### 1. Start Vault Container
```bash
docker compose up -d vault
```

### 2. Initialize Vault with Secrets
**⚠️ REQUIRED - Run this before starting any services:**
```bash
pnpm vault:setup
```

This command:
- Generates a secure INTERNAL_API_KEY
- Stores it in Vault at `secret/shared/internal-api-key`
- Sets up JWT secrets and OAuth credentials
- Saves the generated key to `/tmp/internal-api-key.txt`

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Build All Services
```bash
pnpm -r build
```

### 5. Start Services

**Option A: Docker (Recommended)**
```bash
docker compose up
```

**Option B: Local Development**
```bash
# Terminal 1 - API Gateway
cd infrastructure/api-gateway && pnpm dev

# Terminal 2 - User Service
cd services/user-service && pnpm dev

# Terminal 3 - Game Service
cd services/game-service && pnpm dev

# Terminal 4 - Chat Service
cd services/chat-service && pnpm dev

# Terminal 5 - Frontend
cd apps/web && pnpm dev
```

## Important Notes

### Vault is Required
All services **MUST** connect to Vault to retrieve the `INTERNAL_API_KEY`. 
There is no fallback to environment variables for this key.

If you see errors like:
- `403 Forbidden - Invalid internal API key`
- `CRITICAL: Failed to load INTERNAL_API_KEY from Vault`

**Solution:** Run `pnpm vault:setup` to initialize Vault with secrets.

### Service URLs for Local Development
When running services locally (not in Docker), the `.env` file uses:
- `USER_SERVICE_URL=http://localhost:3001`
- `GAME_SERVICE_URL=http://localhost:3002`
- `CHAT_SERVICE_URL=http://localhost:3003`
- `TOURNAMENT_SERVICE_URL=http://localhost:3004`

When running in Docker, these should be changed to:
- `USER_SERVICE_URL=http://user-service:3001`
- etc.

### Checking Vault Status
```bash
# Check if Vault is running
docker ps | grep vault

# View the generated internal API key
cat /tmp/internal-api-key.txt

# Access Vault UI (development only)
open http://localhost:8200
# Token: dev-root-token
```

## Troubleshooting

### "Cannot connect to Vault"
1. Check Vault is running: `docker ps | grep vault`
2. Start Vault: `docker compose up -d vault`
3. Wait 10 seconds for Vault to be healthy
4. Run setup: `pnpm vault:setup`

### "fetch failed" errors
Services URLs might be misconfigured for your environment (Docker vs local).
Check the service URLs in `.env` match your setup.

### Build errors
```bash
# Clean and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm -r build
```

## Team Workflow

1. **First time setup:**
   ```bash
   docker compose up -d vault
   pnpm vault:setup
   pnpm install
   pnpm -r build
   ```

2. **Daily development:**
   ```bash
   # Start Vault if not running
   docker compose up -d vault
   
   # Start your services
   pnpm dev  # or docker compose up
   ```

3. **After pulling changes:**
   ```bash
   pnpm install
   pnpm -r build
   # Vault setup only needed if vault was reset
   ```

## Additional Resources
- [Vault Quick Guide](docs/development/VAULT-QUICK-GUIDE.md)
- [Architecture Overview](docs/architecture/OVERVIEW.md)
- [Team Guide](docs/development/TEAM_GUIDE.md)
