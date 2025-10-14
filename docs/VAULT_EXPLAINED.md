# 🔐 HashiCorp Vault Integration - Complete Guide

**A beginner-friendly explanation of our Vault implementation**

---

## 📚 Table of Contents

1. [What is Vault and Why Do We Need It?](#what-is-vault)
2. [The Problem We're Solving](#the-problem)
3. [How Vault Works in Our Project](#how-it-works)
4. [Architecture Overview](#architecture)
5. [Step-by-Step Setup Guide](#setup-guide)
6. [How Services Use Vault](#service-usage)
7. [Testing and Validation](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## 🤔 What is Vault and Why Do We Need It? {#what-is-vault}

### The Traditional Approach (Bad ❌)

Before Vault, we stored secrets like this:

```bash
# .env file (INSECURE!)
DATABASE_PASSWORD=mysecretpassword123
JWT_SECRET=super-secret-key
OAUTH_CLIENT_SECRET=abc123xyz
API_KEY=sk_live_1234567890
```

**Problems:**
- ❌ Secrets are in plain text files
- ❌ Committed to Git repositories (security risk!)
- ❌ Hard to rotate secrets
- ❌ No audit trail (who accessed what?)
- ❌ Shared across all environments

### The Vault Approach (Good ✅)

With Vault, secrets are:

- ✅ **Encrypted** at rest and in transit
- ✅ **Centralized** in one secure location
- ✅ **Access-controlled** with policies
- ✅ **Auditable** - every access is logged
- ✅ **Dynamic** - can be rotated without downtime
- ✅ **Environment-specific** - dev/staging/prod separation

---

## 🚨 The Problem We're Solving {#the-problem}

### Before Vault:

```
Our Microservices Architecture:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ User Service│  │ Game Service│  │ Chat Service│
│             │  │             │  │             │
│ DB_PASSWORD │  │ DB_PASSWORD │  │ DB_PASSWORD │
│ JWT_SECRET  │  │ JWT_SECRET  │  │ JWT_SECRET  │
│ in .env 😱  │  │ in .env 😱  │  │ in .env 😱  │
└─────────────┘  └─────────────┘  └─────────────┘
```

**Issues:**
1. Each service has its own `.env` file with secrets
2. Secrets are duplicated across services
3. If a secret is compromised, we must update ALL services
4. No way to know who accessed which secret
5. Developers have full access to production secrets

### After Vault:

```
Our Microservices Architecture:
                ┌──────────────────┐
                │  HashiCorp Vault │
                │  🔐 (Encrypted)  │
                └────────┬─────────┘
                         │
        ┬────────────────┼────────────────┬
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼───────┐
│ User Service │  │ Game Service│  │ Chat Service│
│              │  │             │  │             │
│ Gets secrets │  │ Gets secrets│  │ Gets secrets│
│ from Vault ✅│  │ from Vault ✅│  │ from Vault ✅│
└──────────────┘  └─────────────┘  └─────────────┘
```

**Benefits:**
1. Single source of truth for all secrets
2. Each service has its own access policy
3. Rotate secrets in one place
4. Full audit trail
5. Role-based access control

---

## 🏗️ How Vault Works in Our Project {#how-it-works}

### High-Level Flow:

```
1. Developer starts Vault container
   └─> Vault runs on localhost:8200

2. Vault is initialized with secrets
   └─> Scripts populate database configs, JWT keys, API keys, etc.

3. Service starts up
   └─> Service authenticates with Vault
   └─> Gets its secrets from Vault
   └─> Uses secrets to connect to databases, APIs, etc.

4. Service runs normally
   └─> Secrets are cached for performance
   └─> Can fallback to .env if Vault is down
```

### Vault Components:

```
┌──────────────────────────────────────────────────┐
│                  VAULT SERVER                     │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │        SECRETS ENGINES                   │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │ KV v2 (Key-Value Storage)       │    │    │
│  │  │  • secret/database/*            │    │    │
│  │  │  • secret/jwt/*                 │    │    │
│  │  │  • secret/api/*                 │    │    │
│  │  │  • secret/game/*                │    │    │
│  │  │  • secret/chat/*                │    │    │
│  │  └─────────────────────────────────┘    │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │        AUTHENTICATION                    │    │
│  │  • Token Auth (for development)         │    │
│  │  • AppRole (for services in production) │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │        POLICIES (Access Control)         │    │
│  │  • user-service-policy.hcl              │    │
│  │  • game-service-policy.hcl              │    │
│  │  • chat-service-policy.hcl              │    │
│  │  • tournament-service-policy.hcl        │    │
│  │  • api-gateway-policy.hcl               │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## 🏛️ Architecture Overview {#architecture}

### Project Structure:

```
transcendence/
├── infrastructure/vault/
│   ├── config/
│   │   ├── vault-dev.hcl         # Development config
│   │   ├── vault-prod.hcl        # Production config
│   │   └── vault.hcl              # Base config
│   │
│   ├── policies/                  # Access control rules
│   │   ├── admin-policy.hcl
│   │   ├── user-service-policy.hcl
│   │   ├── game-service-policy.hcl
│   │   ├── chat-service-policy.hcl
│   │   ├── tournament-service-policy.hcl
│   │   └── api-gateway-policy.hcl
│   │
│   ├── scripts/                   # Setup automation
│   │   ├── init-vault.sh          # Initialize Vault
│   │   ├── setup-secrets-dev.sh   # Load dev secrets
│   │   ├── setup-secrets-prod.sh  # Load prod secrets
│   │   ├── test-vault-system.sh   # Test Vault
│   │   └── validate-integration.sh # Validate all services
│   │
│   └── docker/
│       ├── Dockerfile             # Vault container
│       └── docker-compose.vault.yml
│
├── packages/shared-utils/src/vault/  # Vault client library
│   ├── client.ts                  # Core Vault client
│   ├── service-helper.ts          # Service-specific helpers
│   ├── types.ts                   # TypeScript interfaces
│   ├── utils.ts                   # Utility functions
│   └── index.ts                   # Exports
│
└── services/                      # Microservices
    ├── user-service/
    │   └── src/server.ts          # Uses Vault for DB + JWT
    ├── game-service/
    │   └── src/server.ts          # Uses Vault for Redis
    ├── chat-service/
    │   └── src/server.ts          # Uses Vault for Redis
    ├── tournament-service/
    │   └── src/server.ts          # Uses Vault for SQLite
    └── api-gateway/
        └── src/server.ts          # Uses Vault for security
```

---

## 🚀 Step-by-Step Setup Guide {#setup-guide}

### Step 1: Start Vault Container

```bash
# Option A: Using Docker directly
docker run -d --name vault-dev \
  -p 8200:8200 \
  --cap-add=IPC_LOCK \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=dev-root-token' \
  hashicorp/vault:1.18 server -dev

# Option B: Using Docker Compose
cd infrastructure/vault/docker
docker-compose -f docker-compose.vault.yml up -d
```

**What this does:**
- Starts Vault in **dev mode** (NOT for production!)
- Vault listens on `http://localhost:8200`
- Root token is `dev-root-token` (easy for development)
- Dev mode: unsealed, in-memory storage (lost on restart)

### Step 2: Initialize Vault with Secrets

```bash
cd infrastructure/vault/scripts

# Set environment variables
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token

# Run initialization script
bash init-vault.sh dev
```

**What this script does:**

1. **Checks if Vault is running**
   ```bash
   curl http://localhost:8200/v1/sys/health
   ```

2. **Enables secrets engines**
   ```bash
   vault secrets enable -path=secret kv-v2
   ```

3. **Creates policies** (access control)
   ```bash
   vault policy write user-service-policy policies/user-service-policy.hcl
   ```

4. **Enables authentication methods**
   ```bash
   vault auth enable approle
   ```

5. **Populates secrets** (calls `setup-secrets-dev.sh`)
   ```bash
   # Example: User service database config
   vault kv put secret/database/user-service \
     type=sqlite \
     database_url=file:./user-service.db
   
   # Example: JWT authentication secret
   vault kv put secret/jwt/auth \
     secret_key=dev-jwt-secret-key-very-long \
     issuer=transcendence-dev
   ```

### Step 3: Verify Setup

```bash
# Check Vault health
curl http://localhost:8200/v1/sys/health

# List all secrets
vault kv list secret/database

# Read a specific secret
vault kv get secret/database/user-service
```

**Expected output:**
```
====== Data ======
Key                      Value
---                      -----
type                     sqlite
database_url             file:./user-service.db
connection_pool_size     5
migration_run            true
```

---

## 💻 How Services Use Vault {#service-usage}

### Example: User Service

#### 1. Import Vault Helper

```typescript
// services/user-service/src/server.ts
import { createUserServiceVault } from '@transcendence/shared-utils';
```

#### 2. Load Configuration from Vault

```typescript
async function loadConfiguration() {
    // Create Vault client for this service
    const vault = createUserServiceVault();

    try {
        // Initialize and authenticate
        await vault.initialize();

        // Get database configuration from Vault
        const dbConfig = await vault.getDatabaseConfig();
        
        // Get JWT configuration from Vault
        const jwtConfig = await vault.getJWTConfig();

        // Return configuration
        return {
            PORT: 3001,
            DB_PATH: dbConfig.host,  // SQLite path
            JWT_SECRET: jwtConfig.secretKey,
            JWT_ISSUER: jwtConfig.issuer,
            vault  // Keep reference for later use
        };
    } catch (error) {
        console.warn('Vault not available, using environment variables');
        
        // Fallback to .env file
        return {
            PORT: 3001,
            DB_PATH: process.env.USER_SERVICE_DB_PATH || './user-service.db',
            JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
            JWT_ISSUER: process.env.JWT_ISSUER || 'transcendence',
            vault: null
        };
    }
}
```

#### 3. Use Configuration to Start Service

```typescript
async function start() {
    // Load configuration (from Vault or .env)
    const config = await loadConfiguration();
    
    // Log status
    if (config.vault) {
        console.log('✅ Using Vault for secrets');
    } else {
        console.log('⚠️ Using environment variables (Vault unavailable)');
    }
    
    // Start service with configuration
    const app = fastify({ logger: true });
    
    // Connect to database using config
    const db = await open({
        filename: config.DB_PATH,
        driver: sqlite3.Database
    });
    
    // Setup JWT with config
    app.register(fastifyJwt, {
        secret: config.JWT_SECRET,
        sign: { issuer: config.JWT_ISSUER }
    });
    
    await app.listen({ port: config.PORT });
}

start();
```

### What Happens Behind the Scenes:

```
1. Service starts
   └─> Calls createUserServiceVault()
   └─> Returns ServiceVaultHelper instance

2. vault.initialize()
   └─> Reads VAULT_ADDR, VAULT_TOKEN from environment
   └─> Authenticates with Vault server
   └─> Sets up secret caching

3. vault.getDatabaseConfig()
   └─> Makes request: GET /v1/secret/data/database/user-service
   └─> Vault checks: Does this service have permission?
   └─> Returns secret data (encrypted in transit via HTTPS)
   └─> Client caches secret for 5 minutes

4. Service uses secrets
   └─> Connects to database
   └─> Signs JWTs
   └─> etc.
```

---

## 🗂️ Secret Organization {#secret-organization}

### Secrets Path Structure:

```
secret/                          # Root path (KV v2 engine)
├── database/                    # Database configurations
│   ├── user-service             # SQLite for user data
│   ├── game-service             # Redis for game state
│   ├── chat-service             # Redis for chat messages
│   └── tournament-service       # SQLite for tournaments
│
├── jwt/                         # JWT authentication
│   ├── auth                     # User authentication tokens
│   └── game                     # Game websocket tokens
│
├── api/                         # External API credentials
│   ├── oauth                    # OAuth providers (Google, GitHub, 42)
│   └── email                    # SMTP configuration
│
├── game/                        # Game service configuration
│   └── config                   # Game rules, timeouts, etc.
│
├── chat/                        # Chat service configuration
│   └── config                   # Message limits, rate limiting
│
├── gateway/                     # API Gateway configuration
│   └── config                   # CORS, rate limits, security
│
├── monitoring/                  # Observability
│   └── config                   # Metrics, logging, tracing
│
├── security/                    # Security settings
│   └── config                   # Session secrets, CSRF, encryption
│
├── storage/                     # File storage
│   └── config                   # Upload settings, S3 config
│
└── tools/                       # Development tools
    └── config                   # Debug mode, profiling
```

### Example Secret Contents:

#### User Service Database:
```json
{
  "type": "sqlite",
  "database_url": "file:./user-service.db",
  "connection_pool_size": "5",
  "migration_run": "true"
}
```

#### Game Service Database (Redis):
```json
{
  "host": "redis",
  "port": "6379",
  "password": "dev-redis-password",
  "db": "0",
  "connection_pool_size": "10"
}
```

#### JWT Authentication:
```json
{
  "secret_key": "dev-jwt-secret-key-very-long-and-secure",
  "issuer": "transcendence-dev",
  "expiration_hours": "24",
  "refresh_expiration_hours": "168"
}
```

#### OAuth Credentials:
```json
{
  "google_client_id": "dev-google-client-id",
  "google_client_secret": "dev-google-client-secret",
  "github_client_id": "dev-github-client-id",
  "github_client_secret": "dev-github-client-secret",
  "42_client_id": "dev-42-client-id",
  "42_client_secret": "dev-42-client-secret"
}
```

---

## 🔒 Access Control (Policies) {#access-control}

### How Policies Work:

Each service has its own policy that defines what secrets it can access.

**Example: User Service Policy**

```hcl
# infrastructure/vault/policies/user-service-policy.hcl

# Allow reading user service database config
path "secret/data/database/user-service" {
  capabilities = ["read"]
}

# Allow reading JWT secrets
path "secret/data/jwt/auth" {
  capabilities = ["read"]
}

# Allow reading OAuth credentials
path "secret/data/api/oauth" {
  capabilities = ["read"]
}

# DENY access to other services' secrets
path "secret/data/database/game-service" {
  capabilities = ["deny"]
}
```

**What this means:**
- ✅ User service CAN read its own database config
- ✅ User service CAN read JWT secrets (needs them for auth)
- ✅ User service CAN read OAuth credentials
- ❌ User service CANNOT read game service database config
- ❌ User service CANNOT read chat service secrets

### Policy Enforcement:

```
┌──────────────┐
│ User Service │
└──────┬───────┘
       │
       │ Request: GET /v1/secret/data/database/user-service
       │ Token: s.xyz123 (user-service token)
       ▼
┌──────────────────┐
│  Vault Server    │
│                  │
│ 1. Check token   │──> Valid token ✓
│ 2. Check policy  │──> user-service-policy allows read ✓
│ 3. Return secret │──> { type: "sqlite", ... }
└──────────────────┘
```

If user service tries to access game service secrets:

```
┌──────────────┐
│ User Service │
└──────┬───────┘
       │
       │ Request: GET /v1/secret/data/database/game-service
       │ Token: s.xyz123 (user-service token)
       ▼
┌──────────────────┐
│  Vault Server    │
│                  │
│ 1. Check token   │──> Valid token ✓
│ 2. Check policy  │──> user-service-policy DENIES access ✗
│ 3. Return error  │──> 403 Forbidden
└──────────────────┘
```

---

## 🧪 Testing and Validation {#testing}

### Quick Test: Check if Vault is Working

```bash
# Set environment variables
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token

# Test 1: Check Vault health
curl http://localhost:8200/v1/sys/health
# Expected: {"initialized":true,"sealed":false,...}

# Test 2: List secrets
vault kv list secret/database
# Expected: user-service, game-service, chat-service, tournament-service

# Test 3: Read a secret
vault kv get secret/database/user-service
# Expected: Shows database configuration
```

### Run Comprehensive Validation:

```bash
cd infrastructure/vault/scripts

# Run validation script
bash validate-integration.sh
```

**Expected output:**
```
════════════════════════════════════════
  VAULT INTEGRATION VALIDATION
════════════════════════════════════════

📋 Testing Vault Health...
✅ Vault is healthy and initialized

🔐 Testing Service Secrets Access...

User Service:
✅   Database configuration
✅   JWT authentication
✅   OAuth API credentials

Game Service:
✅   Database configuration
✅   Game configuration

Chat Service:
✅   Database configuration
✅   Chat configuration

Tournament Service:
✅   Database configuration

API Gateway:
✅   Gateway configuration
✅   JWT validation

📊 Testing Secret Engines...
✅ KV v2 secrets engine enabled

🔑 Testing Authentication...
✅ Token authentication working

════════════════════════════════════════
  VALIDATION SUMMARY
════════════════════════════════════════
Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100%

✅ All validations passed!
```

### Interactive Web UI Test:

```bash
cd test/vault-test
npm install
npm start
# Visit http://localhost:3099
```

This provides a web interface to:
- Test secret retrieval
- View all secret paths
- Check service authentication
- Monitor Vault health

---

## 🐛 Troubleshooting {#troubleshooting}

### Problem 1: "Connection refused" when accessing Vault

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:8200
```

**Solutions:**

```bash
# Check if Vault is running
docker ps | grep vault

# If not running, start it
docker run -d --name vault-dev \
  -p 8200:8200 \
  --cap-add=IPC_LOCK \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=dev-root-token' \
  hashicorp/vault:1.18 server -dev

# Check if port 8200 is available
netstat -an | grep 8200  # Linux/Mac
Get-NetTCPConnection -LocalPort 8200  # Windows PowerShell
```

### Problem 2: "Permission denied" when reading secrets

**Symptoms:**
```
Error: 403 Forbidden - permission denied
```

**Solutions:**

```bash
# Check your token
echo $VAULT_TOKEN

# Check if token is valid
vault token lookup

# Re-authenticate
export VAULT_TOKEN=dev-root-token

# Check the policy for your service
vault policy read user-service-policy
```

### Problem 3: Service falls back to .env

**Symptoms:**
```
⚠️ User service using environment variables (Vault unavailable)
```

**This is EXPECTED behavior!** The service has a fallback mechanism.

**To use Vault:**

```bash
# Make sure Vault environment variables are set
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token

# Restart your service
npm run dev
```

### Problem 4: "Secret not found"

**Symptoms:**
```
Error: 404 Not Found - no secret at path
```

**Solutions:**

```bash
# List available secrets
vault kv list secret/database

# Check if initialization was run
cd infrastructure/vault/scripts
bash setup-secrets-dev.sh

# Manually add the missing secret
vault kv put secret/database/user-service \
  type=sqlite \
  database_url=file:./user-service.db
```

### Problem 5: Vault is sealed

**Symptoms:**
```
Error: Vault is sealed
```

**Solutions:**

```bash
# Check seal status
vault status

# In dev mode, just restart Vault
docker restart vault-dev

# In production, use unseal keys
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

---

## ✅ Best Practices {#best-practices}

### 1. Never Commit Secrets to Git

```bash
# ❌ WRONG
echo "JWT_SECRET=my-secret-key" >> .env
git add .env
git commit -m "Add secrets"  # DON'T DO THIS!

# ✅ CORRECT
vault kv put secret/jwt/auth secret_key=my-secret-key
# .env file only has Vault connection info
echo "VAULT_ADDR=http://localhost:8200" >> .env
```

### 2. Use Environment-Specific Secrets

```bash
# Development
bash init-vault.sh dev
# Uses: setup-secrets-dev.sh

# Production
bash init-vault.sh prod
# Uses: setup-secrets-prod.sh (with strong passwords!)
```

### 3. Rotate Secrets Regularly

```bash
# Update a secret
vault kv put secret/jwt/auth \
  secret_key=new-rotated-secret-key-$(date +%s)

# Services will pick up new secret:
# - Immediately (no cache) or
# - Within 5 minutes (with cache)
```

### 4. Monitor Vault Access

```bash
# Enable audit logging (production)
vault audit enable file file_path=/vault/logs/audit.log

# View who accessed what
tail -f /vault/logs/audit.log
```

### 5. Use AppRole in Production

```typescript
// ❌ DON'T use root token in production
export VAULT_TOKEN=root-token

// ✅ DO use AppRole authentication
const vault = new VaultClient({
    address: 'https://vault.company.com:8200',
    authMethod: 'approle',
    appRole: {
        roleId: process.env.VAULT_ROLE_ID,
        secretId: process.env.VAULT_SECRET_ID
    }
});
```

### 6. Implement Fallback Mechanisms

```typescript
// Always have a fallback for critical services
try {
    const config = await vault.getDatabaseConfig();
    return config;
} catch (error) {
    console.warn('Vault unavailable, using fallback');
    return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432
    };
}
```

### 7. Cache Secrets Appropriately

```typescript
// ✅ Good: Cache for 5 minutes
const config = {
    enableCache: true,
    cacheTtl: 300  // 5 minutes
};

// ❌ Bad: Cache forever (misses updates)
const config = {
    enableCache: true,
    cacheTtl: 86400  // 24 hours - too long!
};
```

---

## 📊 Cheat Sheet

### Common Commands:

```bash
# Start Vault (dev mode)
docker run -d --name vault-dev -p 8200:8200 \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=dev-root-token' \
  hashicorp/vault:1.18 server -dev

# Set environment
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token

# List secrets
vault kv list secret/database
vault kv list secret/jwt

# Read secret
vault kv get secret/database/user-service
vault kv get -format=json secret/jwt/auth | jq

# Write secret
vault kv put secret/database/user-service type=sqlite

# Check health
curl http://localhost:8200/v1/sys/health

# View policy
vault policy read user-service-policy

# List policies
vault policy list

# Test authentication
vault token lookup

# Run validation
cd infrastructure/vault/scripts
bash validate-integration.sh
```

### Service Integration Pattern:

```typescript
// 1. Import helper
import { createUserServiceVault } from '@transcendence/shared-utils';

// 2. Create Vault instance
const vault = createUserServiceVault();

// 3. Initialize
await vault.initialize();

// 4. Get secrets
const dbConfig = await vault.getDatabaseConfig();
const jwtConfig = await vault.getJWTConfig();

// 5. Use secrets
const db = await connectDatabase(dbConfig);
const jwt = setupJWT(jwtConfig);
```

---

## 🎓 Summary

### What We Achieved:

1. ✅ **Centralized secret management** - One place for all secrets
2. ✅ **Encryption** - Secrets encrypted at rest and in transit
3. ✅ **Access control** - Each service only accesses what it needs
4. ✅ **Audit trail** - Know who accessed what and when
5. ✅ **Easy rotation** - Update secrets without redeploying services
6. ✅ **Environment separation** - Dev/staging/prod isolation
7. ✅ **Fallback mechanism** - Services work even if Vault is down
8. ✅ **Developer-friendly** - Simple API, good documentation

### Database Configuration per Service:

| Service | Database | Storage | Purpose |
|---------|----------|---------|---------|
| User | SQLite 📦 | File | User accounts, profiles |
| Game | Redis 🎮 | Memory | Game state, sessions |
| Chat | Redis 💬 | Memory | Chat messages, presence |
| Tournament | SQLite 📦 | File | Tournament data, brackets |

### Next Steps:

1. **Development**: Use `dev-root-token` and local Vault
2. **Staging**: Use AppRole authentication, separate Vault instance
3. **Production**: Use HA Vault cluster, dynamic secrets, audit logging

---

## 📚 Additional Resources

- **Official Docs**: https://www.vaultproject.io/docs
- **Our Implementation**: See `VAULT_IMPLEMENTATION_COMPLETE.md`
- **Testing Guide**: See `VAULT_TESTING_GUIDE.md`
- **Validation Report**: See `VAULT_VALIDATION_REPORT.md`
- **Quick Test**: See `QUICK_VAULT_TEST.md`

---

**Questions?** Ask in the team channel or check the troubleshooting section above! 🚀
