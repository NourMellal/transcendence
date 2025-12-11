
## Quick Start (3 Examples)

### 1. User Service
```typescript
import { createUserServiceVault } from '@transcendence/shared-utils';

async function loadConfig() {
    // Create Vault helper
    const vault = createUserServiceVault();
    
    // Connect
    await vault.initialize();
    
    // Get secrets
    const jwtConfig = await vault.getJWTConfig();
    const dbConfig = await vault.getDatabaseConfig();
    
    console.log(jwtConfig.secretKey); // JWT signing key
    console.log(dbConfig.host);       // Database path
}
```

### 2. API Gateway
```typescript
import { createAPIGatewayVault } from '@transcendence/shared-utils';

async function setup() {
    const vault = createAPIGatewayVault();
    await vault.initialize();
    
    // Get OAuth 42 credentials
    const oauth = await vault.getAPIConfig();
    console.log(oauth['42_client_id']);
}
```

### 3. Any Service
```typescript
import { createVaultHelper } from '@transcendence/shared-utils';

const vault = createVaultHelper('my-service', {
    jwt: 'secret/data/jwt/auth',
    database: 'secret/data/database/my-service',
});

await vault.initialize();
const jwt = await vault.getJWTConfig();
```

## What's Stored in Vault

| Path | Content |
|------|---------|
| `secret/data/jwt/auth` | JWT signing key, issuer, expiration |
| `secret/data/api/oauth` | OAuth 42 client ID & secret |
| `secret/data/database/user-service` | SQLite database path |
| `secret/data/database/game-service` | Redis connection (host, port) |
| `secret/data/game/config` | Game WebSocket secrets |
| `secret/data/chat/config` | Chat service settings |

## Environment Fallback

If Vault is unavailable, it automatically falls back to environment variables:

```bash
# .env file
JWT_SECRET=my-jwt-secret
DB_HOST=localhost
OAUTH_42_CLIENT_ID=u-s4t2...
```

## Files

- `client-simple.ts` - Vault connection & secret fetching
- `service-helper-simple.ts` - Service wrappers (easy to use!)
- `types-simple.ts` - TypeScript interfaces
- `index-simple.ts` - Exports

**Total: ~400 lines** (vs 2,450 in complex version)

## For PFE Defense

**Show this:**
1. Service using Vault: `services/user-service/src/server.ts`
2. How it works: `packages/shared-utils/src/vault/service-helper-simple.ts`
3. Vault UI: http://localhost:8200 (token: `dev-root-token`)

**Explain (30 seconds):**
> "We use Vault for secret management. Services connect at startup, fetch JWT keys and database configs from Vault. If Vault is down, it falls back to environment variables. Simple and secure."

## Production Note

This simplified version is perfect for PFE. In production, you'd add:
- Token renewal
- Retry logic with exponential backoff
- Advanced caching
- Metrics and monitoring

But for demonstration, simple is better! ✅
