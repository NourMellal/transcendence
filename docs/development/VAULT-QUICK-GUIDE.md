# 🔐 Vault in Thi### 2. **What We Store in Vault**

> Need the full list of secrets per service, with production-ready rotation tips? See [Vault Secrets Inventory & Rotation](../deployment/vault-secrets.md) for the authoritative table and runbooks.

| Secret Type | Why? | Example |
|-------------|------|---------|
| **JWT Keys** | Sign authentication tokens | `secret_key: "abc123..."` |
| **OAuth 42** | 42 School login (MANDATORY) | `42_client_id: "u-s4t2..."` |
| **Database Paths** | SQLite file locations | `host: "./user-service.db"` |
| **Redis Config** | Connection to Redis | `host: "localhost", port: 6379` |
| **Game Settings** | WebSocket secrets | `websocket_secret: "xyz..."` |
| **Internal API Key** | Gateway ↔ services auth | `secret/shared/internal-api-key` |t - Quick Overview

## What You Need to Know (3 Minutes Read)

### 1. What is Vault?
Vault is a **secrets manager**. Instead of putting passwords in your code like this:
```typescript
const PASSWORD = "secret123";  // ❌ BAD - visible in Git!
```

You store them in Vault and fetch them:
```typescript
const password = await vault.getSecret();  // ✅ GOOD - secure!
```

---

### 2. What We Store in Vault

| Secret Type | Why? | Example |
|-------------|------|---------|
| **JWT Keys** | Sign authentication tokens | `secret_key: "abc123..."` |
| **Database Paths** | SQLite file locations | `host: "./user-service.db"` |
| **Redis Config** | Connection to Redis | `host: "localhost", port: 6379` |
| **Game Settings** | WebSocket secrets | `websocket_secret: "xyz..."` |
| **Internal API Key** | Gateway ↔ services auth | `secret/shared/internal-api-key` |

---

### 3. How It Works (Flow)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Service   │ ───▶ │    Vault    │ ───▶ │   Secret    │
│ (user-svc)  │      │  Container  │      │   Stored    │
└─────────────┘      └─────────────┘      └─────────────┘
     ▲                                            │
     └────────────────────────────────────────────┘
              Returns secret to service
```

**Step by step:**
1. Service starts → needs JWT secret
2. Service asks Vault: "Give me JWT secret"
3. Vault returns: `{secret_key: "abc123..."}`
4. Service uses it to sign tokens

---

### 4. Files You Should Know

```
infrastructure/vault/
├── simple-setup.sh          # ⭐ Stores all secrets (run once)
├── README-SIMPLE.md         # 📖 This guide
└── docker-compose.yml       # 🐳 Starts Vault container
```

**In services:**
```
packages/shared-utils/src/vault/
├── client.ts               # 🔧 Vault connection logic
├── service-helper.ts       # 🎁 Easy-to-use functions
└── types.ts                # 📝 TypeScript interfaces
```

---

### 5. Quick Commands

```bash
# Start Vault
docker compose up -d vault

# Store secrets
bash infrastructure/vault/simple-setup.sh

# View secrets in browser
open http://localhost:8200
# Login with token: dev-root-token

# Read generated keys from the running container
docker exec transcendence-vault cat /tmp/internal-api-key.txt
docker exec transcendence-vault cat /tmp/vault-gateway-token.txt

# View secret via CLI
curl -H "X-Vault-Token: dev-root-token" \
  http://localhost:8200/v1/secret/data/jwt/auth | jq
```

---

### 6. Code Example (How Services Use It)

```typescript
// In any service (e.g., user-service/src/server.ts)
import { createUserServiceVault } from '@transcendence/shared-utils';

async function loadConfig() {
    // Create Vault client
    const vault = createUserServiceVault();
    
    // Connect to Vault
    await vault.initialize();
    
    // Get JWT secret from Vault
    const jwtConfig = await vault.getJWTConfig();
    console.log(jwtConfig.secret_key);  // "my-super-secret-jwt-key..."
    
    // Get database config from Vault
    const dbConfig = await vault.getDatabaseConfig();
    console.log(dbConfig.host);  // "./user-service.db"
}
```

---

### 7. Advanced (Optional): Vault Policies

**Current Setup:** All services use one token (`dev-root-token`) - simple and perfect for PFE.

**Optional:** Want to show you understand policies? Run:
```bash
bash infrastructure/vault/setup-policies-optional.sh
```

This creates a policy so API Gateway can ONLY read `jwt/auth`, the OAuth credentials, and the shared internal API key—not other services' secrets.

**For PFE:** Not necessary! Evaluators care that you use Vault, not that you implemented ACLs.

---

### 8. For Your PFE Presentation

**Key Points to Mention:**

1. **Problem:** Hardcoding secrets = security risk
2. **Solution:** Vault stores secrets separately
3. **Benefit:** Secrets not in Git, easy to change
4. **Demo:** Change JWT secret in Vault → all services use new key without code change

**If Asked About Policies:**
> "We use dev mode for simplicity. In production, we'd implement policies with least-privilege access - each service would only access its own secrets. For example, User Service would only read `database/user-service`, not all databases."

**Show this flow:**
```
📝 Code (no secrets) → 🔐 Vault (has secrets) → 🚀 Service (gets secrets)
```

---

### 8. Troubleshooting

| Problem | Solution |
|---------|----------|
| "Vault not running" | `docker compose up -d vault` |
| "Connection refused" | Check Vault is on port 8200: `docker ps` |
| "No secrets found" | Run: `bash infrastructure/vault/simple-setup.sh` |

---

## That's It! 🎉

You now understand:
- ✅ Why we use Vault (security)
- ✅ What we store (JWT, DB config, etc.)
- ✅ How services fetch secrets (Vault client)
- ✅ How to demo it (show secret in Vault UI)

**Full docs:** `infrastructure/vault/README-SIMPLE.md`
