# 🔧 Vault Shared Utils - Complete Explanation

**Understanding `packages/shared-utils/src/vault/`**

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Core Components](#core-components)
4. [How It All Works Together](#how-it-works)
5. [Service Integration](#service-integration)
6. [Advanced Features](#advanced-features)

---

## 🎯 Overview {#overview}

The `@transcendence/shared-utils/vault` package is a **TypeScript client library** that wraps HashiCorp Vault's HTTP API and provides a simple, type-safe interface for all our microservices to access secrets.

### Why We Built This:

Instead of every service implementing its own Vault client:
```typescript
// ❌ Without shared utils (each service repeats this)
const response = await fetch('http://vault:8200/v1/secret/data/database/user-service', {
    headers: { 'X-Vault-Token': process.env.VAULT_TOKEN }
});
const data = await response.json();
const dbConfig = data.data.data;  // Nested structure, confusing!
```

We have a **shared library** that all services use:
```typescript
// ✅ With shared utils (clean and simple)
const vault = createUserServiceVault();
await vault.initialize();
const dbConfig = await vault.getDatabaseConfig();  // Type-safe!
```

### What It Provides:

- ✅ **Type-safe API** - TypeScript interfaces for all operations
- ✅ **Authentication** - Token and AppRole support
- ✅ **Caching** - Reduces Vault requests, improves performance
- ✅ **Retry Logic** - Automatic retries on failures
- ✅ **Error Handling** - Graceful error handling with fallbacks
- ✅ **Service Helpers** - Pre-configured for each microservice
- ✅ **Metrics** - Track usage and performance

---

## 📁 File Structure {#file-structure}

```
packages/shared-utils/src/vault/
├── index.ts              # Main export file (public API)
├── client.ts             # Core Vault client (18888 bytes)
├── service-helper.ts     # Service-specific helpers (11831 bytes)
├── types.ts              # TypeScript interfaces (6136 bytes)
└── utils.ts              # Utility functions (8129 bytes)
```

### Import Hierarchy:

```
┌─────────────────────────────────────────────────┐
│  Services (user, game, chat, tournament, etc.)  │
│  import { createUserServiceVault } from ...     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  index.ts (Public API)                          │
│  • Exports all helpers                          │
│  • Exports all types                            │
│  • Exports utility functions                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  service-helper.ts (Service Abstraction)        │
│  • createUserServiceVault()                     │
│  • createGameServiceVault()                     │
│  • ServiceVaultHelper class                     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  client.ts (Core Vault Client)                  │
│  • VaultClient class                            │
│  • HTTP communication with Vault                │
│  • Authentication, caching, retries             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  types.ts (Type Definitions)                    │
│  • VaultConfig, VaultSecret, etc.               │
└─────────────────────────────────────────────────┘
                 │
┌─────────────────┴───────────────────────────────┐
│  utils.ts (Helper Functions)                    │
│  • parseVaultResponse(), buildVaultUrl(), etc.  │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Core Components {#core-components}

### 1. **types.ts** - Type Definitions

This file defines all TypeScript interfaces and types used throughout the Vault client.

#### Key Interfaces:

##### **VaultConfig**
```typescript
export interface VaultConfig {
    /** Vault server address */
    address: string;  // e.g., "http://localhost:8200"

    /** Authentication method: 'token' | 'approle' */
    authMethod: 'token' | 'approle';

    /** Direct token for token auth */
    token?: string;  // For development

    /** AppRole credentials for production */
    appRole?: {
        roleId: string;
        secretId: string;
        mountPath?: string;
    };

    /** Request timeout in milliseconds */
    timeout?: number;  // default: 5000

    /** Maximum retry attempts */
    maxRetries?: number;  // default: 3

    /** Cache settings */
    enableCache?: boolean;  // default: true
    cacheTtl?: number;  // default: 300 (5 minutes)

    /** TLS configuration */
    tls?: {
        skipVerify?: boolean;
        caCert?: string;
        clientCert?: string;
        clientKey?: string;
    };

    /** Debug mode */
    debug?: boolean;
}
```

**Usage Example:**
```typescript
const config: VaultConfig = {
    address: 'http://localhost:8200',
    authMethod: 'token',
    token: 'dev-root-token',
    timeout: 5000,
    enableCache: true,
    cacheTtl: 300
};
```

##### **VaultSecret**
```typescript
export interface VaultSecret {
    /** Secret data */
    data: Record<string, any>;

    /** Metadata about the secret */
    metadata: {
        createdTime: string;
        deletionTime?: string;
        destroyed: boolean;
        version: number;
    };

    /** Lease information */
    lease?: {
        id: string;
        duration: number;
        renewable: boolean;
    };
}
```

**What Vault Returns:**
```json
{
  "data": {
    "data": {
      "type": "sqlite",
      "database_url": "file:./user-service.db"
    },
    "metadata": {
      "created_time": "2025-10-08T12:00:00Z",
      "version": 1
    }
  }
}
```

**Our Interface Simplifies It:**
```typescript
const secret: VaultSecret = {
    data: {
        type: "sqlite",
        database_url: "file:./user-service.db"
    },
    metadata: {
        createdTime: "2025-10-08T12:00:00Z",
        version: 1,
        destroyed: false
    }
};
```

##### **VaultError**
```typescript
export interface VaultError extends Error {
    status?: number;        // HTTP status code (403, 404, etc.)
    errors?: string[];      // Vault error messages
    url?: string;           // Request URL that failed
    retryable?: boolean;    // Can we retry this?
}
```

---

### 2. **client.ts** - Core Vault Client

This is the **heart** of the library. It implements the `VaultClient` class that communicates with Vault's HTTP API.

#### Architecture:

```
┌─────────────────────────────────────────────────┐
│              VaultClient                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  Constructor(config)                            │
│  └─> Validates configuration                    │
│  └─> Sets up cache                              │
│  └─> Initializes metrics                        │
│                                                 │
│  initialize()                                   │
│  └─> Authenticates with Vault                   │
│  └─> Stores client token                        │
│  └─> Starts token renewal                       │
│                                                 │
│  getSecret(path)                                │
│  └─> Check cache first                          │
│  └─> If miss: HTTP GET to Vault                 │
│  └─> Parse response                             │
│  └─> Cache result                               │
│  └─> Return VaultSecret                         │
│                                                 │
│  putSecret(path, data)                          │
│  └─> HTTP POST to Vault                         │
│  └─> Invalidate cache                           │
│                                                 │
│  Private: _makeRequest(method, path, data)      │
│  └─> Build HTTP request                         │
│  └─> Add authentication headers                 │
│  └─> Retry on failures                          │
│  └─> Handle errors                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Key Methods:

##### **initialize(): Promise<void>**
```typescript
/**
 * Initialize the client and authenticate with Vault
 */
async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.authMethod === 'token') {
        // Token auth: use provided token
        this.clientToken = this.config.token;
    } else if (this.config.authMethod === 'approle') {
        // AppRole auth: login to get token
        await this._authenticateAppRole();
    }

    // Test authentication
    await this.healthCheck();
    
    this.initialized = true;
}
```

**What Happens:**
1. Check if already initialized
2. Authenticate based on method:
   - **Token**: Use provided token directly
   - **AppRole**: Login with roleId + secretId to get token
3. Verify authentication with health check
4. Mark as initialized

##### **getSecret(path, version?): Promise<VaultSecret>**
```typescript
/**
 * Get a secret from Vault
 * @param path - Secret path (e.g., 'secret/database/user-service')
 * @param version - Specific version to retrieve (optional)
 */
async getSecret(path: string, version?: number): Promise<VaultSecret> {
    // 1. Check cache first
    const cacheKey = `${path}:${version || 'latest'}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
        this.metrics.cacheHits++;
        return cached;
    }

    // 2. Build Vault API URL
    const url = version
        ? `${this.config.address}/v1/${path}?version=${version}`
        : `${this.config.address}/v1/${path}`;

    // 3. Make HTTP request
    const response = await this._makeRequest('GET', url);

    // 4. Parse response
    const secret: VaultSecret = {
        data: response.data.data,
        metadata: response.data.metadata
    };

    // 5. Cache result
    this._setCache(cacheKey, secret);

    // 6. Update metrics
    this.metrics.totalRequests++;

    return secret;
}
```

**Flow Diagram:**
```
User calls: vault.getSecret('secret/database/user-service')
    │
    ▼
Check cache: Do we have this secret already?
    │
    ├─> YES: Return cached value (fast! ~1ms)
    │
    └─> NO: Fetch from Vault
            │
            ▼
        Build URL: http://localhost:8200/v1/secret/data/database/user-service
            │
            ▼
        Make HTTP GET with auth header
            │
            ▼
        Receive response from Vault
            │
            ▼
        Parse nested JSON structure
            │
            ▼
        Store in cache (TTL: 5 minutes)
            │
            ▼
        Return VaultSecret object
```

##### **putSecret(path, data): Promise<void>**
```typescript
/**
 * Store a secret in Vault
 * @param path - Secret path
 * @param data - Secret data
 */
async putSecret(path: string, data: Record<string, any>): Promise<void> {
    const url = `${this.config.address}/v1/${path}`;
    
    // Wrap data in required structure
    const payload = {
        data: data
    };

    await this._makeRequest('POST', url, payload);

    // Invalidate cache for this path
    this._invalidateCache(path);
}
```

##### **_makeRequest(method, url, data?): Promise<any>** (Private)
```typescript
/**
 * Make authenticated HTTP request to Vault with retry logic
 */
private async _makeRequest(
    method: string,
    url: string,
    data?: any
): Promise<any> {
    let lastError: any;
    
    // Retry loop
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'X-Vault-Token': this.clientToken!,
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : undefined,
                signal: AbortSignal.timeout(this.config.timeout)
            });

            if (!response.ok) {
                throw await this._handleErrorResponse(response);
            }

            return await response.json();

        } catch (error) {
            lastError = error;
            
            // Retry if retryable
            if (this._isRetryable(error) && attempt < this.config.maxRetries) {
                await this._delay(this.config.retryDelay * attempt);
                continue;
            }
            
            throw error;
        }
    }
    
    throw lastError;
}
```

**Retry Strategy:**
```
Attempt 1: Immediate
    │
    ├─> Success: Return result
    │
    └─> Failure (retryable):
            │
            ▼
        Wait 1 second
            │
            ▼
        Attempt 2: Retry
            │
            ├─> Success: Return result
            │
            └─> Failure (retryable):
                    │
                    ▼
                Wait 2 seconds
                    │
                    ▼
                Attempt 3: Final retry
                    │
                    ├─> Success: Return result
                    │
                    └─> Failure: Throw error
```

#### Caching System:

```typescript
private cache: Map<string, CacheEntry> = new Map();

private _getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return null;
    }
    
    return entry.data as T;
}

private _setCache(key: string, data: any): void {
    if (!this.config.enableCache) return;
    
    this.cache.set(key, {
        data,
        expiresAt: Date.now() + (this.config.cacheTtl * 1000),
        createdAt: Date.now()
    });
}
```

**Cache Behavior:**
```
First request:
    vault.getSecret('secret/database/user-service')
    └─> Cache MISS → Fetch from Vault (100ms)
    └─> Store in cache with 5-minute TTL

Second request (within 5 minutes):
    vault.getSecret('secret/database/user-service')
    └─> Cache HIT → Return cached value (1ms)

Third request (after 5 minutes):
    vault.getSecret('secret/database/user-service')
    └─> Cache EXPIRED → Fetch from Vault again (100ms)
    └─> Update cache
```

---

### 3. **service-helper.ts** - Service-Specific Abstraction

This file provides **high-level helpers** tailored for each microservice. It wraps the `VaultClient` with service-specific logic.

#### ServiceVaultHelper Class:

```typescript
/**
 * Service-specific Vault helper
 * Provides typed methods for common secret retrieval patterns
 */
export class ServiceVaultHelper {
    private client: VaultClient;
    private serviceConfig: ServiceVaultConfig;
    private initialized: boolean = false;

    constructor(config: VaultConfig, serviceConfig: ServiceVaultConfig) {
        this.client = new VaultClient(config);
        this.serviceConfig = serviceConfig;
    }

    /**
     * Initialize the Vault client
     */
    async initialize(): Promise<void> {
        await this.client.initialize();
        this.initialized = true;
    }

    /**
     * Get database configuration
     */
    async getDatabaseConfig(): Promise<DatabaseConfig> {
        const path = this.serviceConfig.secretPaths.database;
        const secret = await this.client.getSecret(path!);
        
        return {
            host: secret.data.host,
            port: parseInt(secret.data.port),
            database: secret.data.database,
            username: secret.data.username,
            password: secret.data.password,
            ssl: secret.data.ssl_mode !== 'disable',
            connectionPoolSize: parseInt(secret.data.connection_pool_size)
        };
    }

    /**
     * Get JWT configuration
     */
    async getJWTConfig(): Promise<JWTConfig> {
        const path = this.serviceConfig.secretPaths.jwt;
        const secret = await this.client.getSecret(path!);
        
        return {
            secretKey: secret.data.secret_key,
            issuer: secret.data.issuer,
            expirationHours: parseInt(secret.data.expiration_hours),
            refreshExpirationHours: parseInt(secret.data.refresh_expiration_hours)
        };
    }

    /**
     * Get service-specific configuration
     */
    async getServiceConfig(): Promise<Record<string, any>> {
        const path = this.serviceConfig.secretPaths.config;
        const secret = await this.client.getSecret(path!);
        return secret.data;
    }

    // ... more helper methods
}
```

#### Pre-configured Service Helpers:

##### **createUserServiceVault()**
```typescript
/**
 * Create Vault helper for User Service
 */
export function createUserServiceVault(): ServiceVaultHelper {
    const config: VaultConfig = {
        address: process.env.VAULT_ADDR || 'http://localhost:8200',
        authMethod: 'token',
        token: process.env.VAULT_TOKEN,
        timeout: 5000,
        maxRetries: 3,
        enableCache: true,
        cacheTtl: 300
    };

    const serviceConfig: ServiceVaultConfig = {
        serviceName: 'user-service',
        secretPaths: {
            database: 'secret/database/user-service',
            jwt: 'secret/jwt/auth',
            api: 'secret/api/oauth',
            config: 'secret/security/config'
        }
    };

    return new ServiceVaultHelper(config, serviceConfig);
}
```

**What This Does:**
1. Reads `VAULT_ADDR` and `VAULT_TOKEN` from environment
2. Configures caching, retries, timeouts
3. Maps service-specific secret paths
4. Returns ready-to-use helper

**Usage in User Service:**
```typescript
// services/user-service/src/server.ts
import { createUserServiceVault } from '@transcendence/shared-utils';

async function loadConfiguration() {
    const vault = createUserServiceVault();
    await vault.initialize();
    
    // Type-safe method calls
    const dbConfig = await vault.getDatabaseConfig();
    const jwtConfig = await vault.getJWTConfig();
    
    return { dbConfig, jwtConfig };
}
```

##### **createGameServiceVault()**
```typescript
export function createGameServiceVault(): ServiceVaultHelper {
    return new ServiceVaultHelper(
        {
            address: process.env.VAULT_ADDR || 'http://localhost:8200',
            authMethod: 'token',
            token: process.env.VAULT_TOKEN,
            timeout: 5000,
            maxRetries: 3,
            enableCache: true,
            cacheTtl: 300
        },
        {
            serviceName: 'game-service',
            secretPaths: {
                database: 'secret/database/game-service',  // Redis config
                config: 'secret/game/config'                // Game rules
            }
        }
    );
}
```

##### Other Service Helpers:
- `createChatServiceVault()`
- `createTournamentServiceVault()`
- `createAPIGatewayVault()`

Each pre-configured with the correct secret paths for that service.

---

### 4. **utils.ts** - Utility Functions

Helper functions used throughout the library.

#### Key Functions:

##### **parseVaultResponse()**
```typescript
/**
 * Parse Vault's nested JSON response structure
 */
export function parseVaultResponse(response: any): VaultSecret {
    // Vault returns: { data: { data: {...}, metadata: {...} } }
    // We simplify to: { data: {...}, metadata: {...} }
    
    if (!response.data) {
        throw new VaultError('Invalid Vault response: missing data field');
    }

    return {
        data: response.data.data || {},
        metadata: response.data.metadata || {
            createdTime: new Date().toISOString(),
            version: 1,
            destroyed: false
        }
    };
}
```

##### **buildVaultUrl()**
```typescript
/**
 * Build proper Vault API URL
 */
export function buildVaultUrl(
    address: string,
    path: string,
    version?: number
): string {
    // Normalize address (remove trailing slash)
    const base = address.replace(/\/$/, '');
    
    // Normalize path (add leading slash if missing)
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Add version parameter if specified
    const versionParam = version ? `?version=${version}` : '';
    
    return `${base}/v1${normalizedPath}${versionParam}`;
}
```

**Examples:**
```typescript
buildVaultUrl('http://localhost:8200', 'secret/database/user-service')
// → 'http://localhost:8200/v1/secret/database/user-service'

buildVaultUrl('http://localhost:8200/', '/secret/jwt/auth', 2)
// → 'http://localhost:8200/v1/secret/jwt/auth?version=2'
```

##### **validateVaultConfig()**
```typescript
/**
 * Validate Vault configuration
 */
export function validateVaultConfig(config: VaultConfig): void {
    if (!config.address) {
        throw new Error('Vault address is required');
    }

    if (!config.address.startsWith('http')) {
        throw new Error('Vault address must start with http:// or https://');
    }

    if (config.authMethod === 'token' && !config.token) {
        throw new Error('Token is required for token authentication');
    }

    if (config.authMethod === 'approle') {
        if (!config.appRole?.roleId) {
            throw new Error('Role ID is required for AppRole authentication');
        }
        if (!config.appRole?.secretId) {
            throw new Error('Secret ID is required for AppRole authentication');
        }
    }

    if (config.timeout && config.timeout < 1000) {
        throw new Error('Timeout must be at least 1000ms');
    }

    if (config.maxRetries && config.maxRetries < 1) {
        throw new Error('Max retries must be at least 1');
    }
}
```

##### **isRetryableError()**
```typescript
/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return true;
    }

    // HTTP 5xx errors are retryable
    if (error.status >= 500 && error.status < 600) {
        return true;
    }

    // HTTP 429 (rate limit) is retryable
    if (error.status === 429) {
        return true;
    }

    // Everything else is not retryable
    return false;
}
```

---

### 5. **index.ts** - Public API

This file exports everything that services need to use.

```typescript
/**
 * Vault Client Library for Transcendence
 * 
 * Public API exports
 */

// Core client
export { VaultClient } from './client';
export { ServiceVaultHelper } from './service-helper';

// Service factory functions
export {
    createUserServiceVault,
    createGameServiceVault,
    createChatServiceVault,
    createTournamentServiceVault,
    createAPIGatewayVault
} from './service-helper';

// Type definitions
export type {
    VaultConfig,
    VaultSecret,
    VaultAuthResponse,
    VaultError,
    VaultMetrics,
    ServiceVaultConfig,
    IVaultClient
} from './types';

// Utility functions
export {
    parseVaultResponse,
    buildVaultUrl,
    validateVaultConfig,
    isRetryableError
} from './utils';
```

---

## 🔄 How It All Works Together {#how-it-works}

### Complete Flow: Service Startup to Secret Retrieval

```
1. Service imports helper
   ┌─────────────────────────────────────────────────┐
   │ import { createUserServiceVault } from          │
   │   '@transcendence/shared-utils';                │
   └───────────────────┬─────────────────────────────┘
                       │
                       ▼
2. Create Vault instance
   ┌─────────────────────────────────────────────────┐
   │ const vault = createUserServiceVault();         │
   │                                                 │
   │ Behind the scenes:                              │
   │ • Reads VAULT_ADDR from env                     │
   │ • Reads VAULT_TOKEN from env                    │
   │ • Creates VaultClient instance                  │
   │ • Wraps in ServiceVaultHelper                   │
   │ • Configures secret paths                       │
   └───────────────────┬─────────────────────────────┘
                       │
                       ▼
3. Initialize
   ┌─────────────────────────────────────────────────┐
   │ await vault.initialize();                       │
   │                                                 │
   │ Behind the scenes:                              │
   │ • VaultClient authenticates with Vault          │
   │ • Stores client token                           │
   │ • Performs health check                         │
   │ • Initializes cache                             │
   │ • Initializes metrics                           │
   └───────────────────┬─────────────────────────────┘
                       │
                       ▼
4. Get database config
   ┌─────────────────────────────────────────────────┐
   │ const dbConfig = await vault.getDatabaseConfig();│
   │                                                 │
   │ Behind the scenes:                              │
   │ ServiceVaultHelper:                             │
   │ • Looks up path: secret/database/user-service   │
   │ • Calls client.getSecret(path)                  │
   │                                                 │
   │ VaultClient:                                    │
   │ • Checks cache (MISS on first call)             │
   │ • Builds URL with buildVaultUrl()               │
   │ • Makes HTTP GET with _makeRequest()            │
   │   └─> Adds X-Vault-Token header                 │
   │   └─> Sets timeout                              │
   │   └─> Handles retries                           │
   │ • Receives JSON response                        │
   │ • Parses with parseVaultResponse()              │
   │ • Stores in cache (TTL: 5 min)                  │
   │ • Returns VaultSecret                           │
   │                                                 │
   │ ServiceVaultHelper:                             │
   │ • Extracts fields from secret.data              │
   │ • Converts types (string → number)              │
   │ • Returns typed DatabaseConfig                  │
   └───────────────────┬─────────────────────────────┘
                       │
                       ▼
5. Use configuration
   ┌─────────────────────────────────────────────────┐
   │ const db = await connectDatabase(dbConfig);     │
   │                                                 │
   │ Service now has:                                │
   │ • dbConfig.host = 'localhost'                   │
   │ • dbConfig.port = 5432                          │
   │ • dbConfig.database = 'transcendence'           │
   │ • dbConfig.username = 'user'                    │
   │ • dbConfig.password = 'secret123'               │
   │ • All type-safe and validated!                  │
   └─────────────────────────────────────────────────┘
```

### Request Flow Diagram:

```
Service Code:
  const vault = createUserServiceVault()
  await vault.initialize()
  const dbConfig = await vault.getDatabaseConfig()
        │
        │ (through shared-utils library)
        │
        ▼
┌─────────────────────────────────────────┐
│     ServiceVaultHelper                  │
│  (service-helper.ts)                    │
│                                         │
│  getDatabaseConfig() {                  │
│    const path = 'secret/database/...';  │
│    const secret = await                 │
│      this.client.getSecret(path);       │
│    return parseToTypedConfig(secret);   │
│  }                                      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│     VaultClient                         │
│  (client.ts)                            │
│                                         │
│  getSecret(path) {                      │
│    • Check cache                        │
│    • Build URL                          │
│    • Make HTTP request                  │
│    • Parse response                     │
│    • Cache result                       │
│    • Return VaultSecret                 │
│  }                                      │
└────────────┬────────────────────────────┘
             │
             │ HTTP GET
             │ X-Vault-Token: xxx
             │
             ▼
┌─────────────────────────────────────────┐
│     Vault Server                        │
│  (HashiCorp Vault)                      │
│                                         │
│  1. Verify token                        │
│  2. Check policy permissions            │
│  3. Retrieve secret                     │
│  4. Return JSON response                │
└────────────┬────────────────────────────┘
             │
             │ JSON Response:
             │ {
             │   "data": {
             │     "data": { ... },
             │     "metadata": { ... }
             │   }
             │ }
             │
             ▼
        Parse & Return
             │
             ▼
        Service receives
        typed configuration
```

---

## 🎯 Service Integration Examples {#service-integration}

### Example 1: User Service (Full Integration)

```typescript
// services/user-service/src/server.ts
import { 
    createUserServiceVault,
    VaultError 
} from '@transcendence/shared-utils';

async function loadConfiguration() {
    // 1. Create Vault helper (pre-configured for user service)
    const vault = createUserServiceVault();

    try {
        // 2. Initialize and authenticate
        await vault.initialize();
        console.log('✅ Vault connection established');

        // 3. Get database configuration
        const dbConfig = await vault.getDatabaseConfig();
        console.log('✅ Database config retrieved from Vault');

        // 4. Get JWT configuration
        const jwtConfig = await vault.getJWTConfig();
        console.log('✅ JWT config retrieved from Vault');

        // 5. Get OAuth configuration
        const oauthConfig = await vault.getAPIConfig();
        console.log('✅ OAuth config retrieved from Vault');

        // 6. Return configuration
        return {
            PORT: 3001,
            // Database
            DB_PATH: dbConfig.host,  // For SQLite
            DB_POOL_SIZE: dbConfig.connectionPoolSize,
            // JWT
            JWT_SECRET: jwtConfig.secretKey,
            JWT_ISSUER: jwtConfig.issuer,
            JWT_EXPIRATION: jwtConfig.expirationHours,
            // OAuth
            GOOGLE_CLIENT_ID: oauthConfig.google_client_id,
            GOOGLE_CLIENT_SECRET: oauthConfig.google_client_secret,
            // Keep vault instance for later
            vault
        };

    } catch (error) {
        if (error instanceof VaultError) {
            console.error('❌ Vault error:', error.message);
            console.error('Status:', error.status);
            console.error('Errors:', error.errors);
        }

        console.warn('⚠️ Falling back to environment variables');

        // Fallback to .env file
        return {
            PORT: 3001,
            DB_PATH: process.env.USER_SERVICE_DB_PATH || './user-service.db',
            JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
            JWT_ISSUER: process.env.JWT_ISSUER || 'transcendence',
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
            vault: null
        };
    }
}

async function start() {
    // Load configuration
    const config = await loadConfiguration();

    // Log which source we're using
    if (config.vault) {
        console.log('🔐 Using secrets from Vault');
    } else {
        console.log('📄 Using secrets from environment variables');
    }

    // Start service with configuration
    const app = fastify({ logger: true });
    
    // ... setup database, JWT, routes, etc.
    
    await app.listen({ port: config.PORT });
}

start();
```

### Example 2: Game Service (Redis Configuration)

```typescript
// services/game-service/src/server.ts
import { createGameServiceVault } from '@transcendence/shared-utils';

async function loadConfiguration() {
    const vault = createGameServiceVault();

    try {
        await vault.initialize();

        // Get Redis configuration (stored in database path)
        const redisConfig = await vault.getDatabaseConfig();
        
        // Get game rules configuration
        const gameConfig = await vault.getServiceConfig();

        return {
            PORT: 3002,
            // Redis (from database config)
            REDIS_HOST: redisConfig.host,
            REDIS_PORT: redisConfig.port,
            REDIS_PASSWORD: redisConfig.password,
            REDIS_DB: 0,  // Game state DB
            // Game rules (from service config)
            ROOM_CAPACITY: gameConfig.roomCapacity || 2,
            GAME_TIMEOUT_MINUTES: gameConfig.timeoutMinutes || 30,
            SCORE_LIMIT: gameConfig.scoreLimit || 11,
            BALL_SPEED: gameConfig.ballSpeed || 5,
            vault
        };
    } catch (error) {
        console.warn('Vault unavailable, using environment variables');
        
        return {
            PORT: 3002,
            REDIS_HOST: process.env.REDIS_HOST || 'localhost',
            REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
            REDIS_PASSWORD: process.env.REDIS_PASSWORD,
            REDIS_DB: 0,
            ROOM_CAPACITY: 2,
            GAME_TIMEOUT_MINUTES: 30,
            SCORE_LIMIT: 11,
            BALL_SPEED: 5,
            vault: null
        };
    }
}
```

### Example 3: Custom Secret Access

```typescript
// services/tournament-service/src/server.ts
import { createTournamentServiceVault } from '@transcendence/shared-utils';

async function loadConfiguration() {
    const vault = createTournamentServiceVault();

    try {
        await vault.initialize();

        // Method 1: Use helper methods
        const serviceConfig = await vault.getServiceConfig();

        // Method 2: Direct access to underlying client for custom secrets
        const notificationSecret = await vault.client.getSecret(
            'secret/api/notifications'
        );

        return {
            PORT: 3004,
            MAX_TOURNAMENT_SIZE: serviceConfig.maxTournamentSize || 32,
            TOURNAMENT_TIMEOUT_HOURS: serviceConfig.timeoutHours || 24,
            // Custom secret access
            WEBHOOK_URL: notificationSecret.data.webhook_url,
            WEBHOOK_SECRET: notificationSecret.data.webhook_secret,
            vault
        };
    } catch (error) {
        // Fallback...
    }
}
```

---

## 🚀 Advanced Features {#advanced-features}

### 1. Caching Strategy

**Why Cache?**
- Reduces latency (1ms vs 100ms)
- Reduces Vault server load
- Improves reliability (works during brief Vault outages)

**Cache Configuration:**
```typescript
const vault = new VaultClient({
    address: 'http://localhost:8200',
    authMethod: 'token',
    token: 'dev-root-token',
    enableCache: true,      // Enable caching
    cacheTtl: 300          // 5 minutes TTL
});
```

**Cache Behavior:**
```typescript
// First call: Cache MISS
const config1 = await vault.getSecret('secret/database/user-service');
// Takes 100ms, fetches from Vault, stores in cache

// Second call (within 5 min): Cache HIT
const config2 = await vault.getSecret('secret/database/user-service');
// Takes 1ms, returns from cache

// After 5 minutes: Cache EXPIRED
const config3 = await vault.getSecret('secret/database/user-service');
// Takes 100ms, re-fetches from Vault, updates cache
```

**Manual Cache Control:**
```typescript
// Clear all cache
vault.clearCache();

// Cache is automatically invalidated on write
await vault.putSecret('secret/database/user-service', newData);
// Cache for this path is now cleared
```

### 2. Retry Logic

**Automatic Retries:**
```typescript
const vault = new VaultClient({
    address: 'http://localhost:8200',
    authMethod: 'token',
    token: 'dev-root-token',
    maxRetries: 3,         // Try up to 3 times
    retryDelay: 1000       // Wait 1s between retries
});
```

**Retry Flow:**
```
Request → Attempt 1
            │
            ├─> Success: Return
            │
            └─> Failure (retryable):
                    │
                    ▼
                Wait 1 second
                    │
                    ▼
                Attempt 2
                    │
                    ├─> Success: Return
                    │
                    └─> Failure (retryable):
                            │
                            ▼
                        Wait 2 seconds
                            │
                            ▼
                        Attempt 3 (final)
                            │
                            ├─> Success: Return
                            │
                            └─> Failure: Throw error
```

**Retryable vs Non-Retryable:**
```typescript
// Retryable (network issues, server errors)
- Connection refused (ECONNREFUSED)
- Timeout (ETIMEDOUT)
- HTTP 5xx (server errors)
- HTTP 429 (rate limit)

// Non-retryable (client errors, auth failures)
- HTTP 403 (permission denied)
- HTTP 404 (not found)
- HTTP 401 (unauthorized)
- Invalid token
```

### 3. Error Handling

**Custom Error Types:**
```typescript
try {
    const secret = await vault.getSecret('secret/database/user-service');
} catch (error) {
    if (error instanceof VaultError) {
        console.error('Vault error:', error.message);
        console.error('HTTP status:', error.status);
        console.error('Vault errors:', error.errors);
        console.error('Failed URL:', error.url);
        console.error('Retryable:', error.retryable);
    } else {
        console.error('Unknown error:', error);
    }
}
```

**Common Errors:**

| Error | Status | Meaning | Solution |
|-------|--------|---------|----------|
| Permission denied | 403 | Policy doesn't allow access | Check policy configuration |
| Not found | 404 | Secret doesn't exist | Create secret or check path |
| Unauthorized | 401 | Invalid token | Check VAULT_TOKEN |
| Connection refused | - | Vault not running | Start Vault container |
| Timeout | - | Vault too slow | Increase timeout or check network |

### 4. Metrics and Monitoring

**Available Metrics:**
```typescript
const metrics = vault.getMetrics();

console.log('Total requests:', metrics.totalRequests);
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Avg response time:', metrics.avgResponseTime);
console.log('Auth renewals:', metrics.authRenewals);
console.log('Error rate:', metrics.errorRate);
console.log('Last auth:', metrics.lastAuthTime);
console.log('Token expires:', metrics.tokenExpiresAt);
```

**Example Output:**
```json
{
  "totalRequests": 150,
  "cacheHitRate": 0.85,
  "avgResponseTime": 12.5,
  "authRenewals": 2,
  "errorRate": 0.01,
  "lastAuthTime": "2025-10-08T12:00:00Z",
  "tokenExpiresAt": "2025-10-08T18:00:00Z"
}
```

### 5. Production Features

**AppRole Authentication (Production):**
```typescript
const vault = new VaultClient({
    address: 'https://vault.company.com:8200',
    authMethod: 'approle',
    appRole: {
        roleId: process.env.VAULT_ROLE_ID,
        secretId: process.env.VAULT_SECRET_ID,
        mountPath: 'approle'  // default
    },
    tls: {
        skipVerify: false,  // Always verify in production!
        caCert: '/path/to/ca.crt'
    }
});
```

**Token Renewal:**
```typescript
// Automatic token renewal (if token is renewable)
await vault.renewToken();

// Health check
const isHealthy = await vault.healthCheck();
if (!isHealthy) {
    console.error('Vault is unhealthy!');
}
```

**Graceful Shutdown:**
```typescript
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    
    // Close Vault connection
    await vault.shutdown();
    
    // Close other connections...
    
    process.exit(0);
});
```

---

## 📊 Summary

### What We Built:

1. **VaultClient** (`client.ts`)
   - Core HTTP client for Vault API
   - Authentication (Token, AppRole)
   - Caching with TTL
   - Retry logic
   - Error handling
   - Metrics tracking

2. **ServiceVaultHelper** (`service-helper.ts`)
   - Service-specific abstraction
   - Pre-configured factory functions
   - Typed helper methods
   - Secret path mapping

3. **Type Definitions** (`types.ts`)
   - TypeScript interfaces
   - Type safety
   - IntelliSense support

4. **Utility Functions** (`utils.ts`)
   - URL building
   - Response parsing
   - Config validation
   - Error classification

5. **Public API** (`index.ts`)
   - Clean exports
   - Easy imports
   - Documented usage

### Key Benefits:

✅ **Type-Safe** - Full TypeScript support with interfaces
✅ **Easy to Use** - Simple API, pre-configured helpers
✅ **Performant** - Caching reduces latency by 99%
✅ **Reliable** - Retry logic handles transient failures
✅ **Maintainable** - Centralized in shared library
✅ **Flexible** - Works for all services, extensible
✅ **Production-Ready** - AppRole, TLS, metrics, monitoring

### Usage Pattern:

```typescript
// 1. Import
import { createUserServiceVault } from '@transcendence/shared-utils';

// 2. Create
const vault = createUserServiceVault();

// 3. Initialize
await vault.initialize();

// 4. Use
const dbConfig = await vault.getDatabaseConfig();
const jwtConfig = await vault.getJWTConfig();

// 5. Done!
```

That's it! The shared-utils library handles all the complexity of Vault communication, caching, retries, and error handling. Services just import and use! 🚀