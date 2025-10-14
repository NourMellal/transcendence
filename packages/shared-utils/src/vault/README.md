# Vault Client Usage Examples

This document provides comprehensive examples of how to use the Vault client in Transcendence microservices.

## 📚 Table of Contents

1. [Basic Setup](#basic-setup)
2. [Service Integration](#service-integration)
3. [Configuration Examples](#configuration-examples)
4. [Error Handling](#error-handling)
5. [Advanced Usage](#advanced-usage)
6. [Best Practices](#best-practices)

## 🚀 Basic Setup

### Simple Token Authentication

```typescript
import { VaultClient } from '@transcendence/shared-utils';

const client = new VaultClient({
  address: 'http://localhost:8200',
  authMethod: 'token',
  token: 'dev-root-token-123'
});

await client.initialize();

// Get a secret
const secret = await client.getSecret('secret/database/user-service');
console.log(secret.data.password);
```

### AppRole Authentication (Production)

```typescript
import { VaultClient } from '@transcendence/shared-utils';

const client = new VaultClient({
  address: 'https://vault.company.com:8200',
  authMethod: 'approle',
  appRole: {
    roleId: process.env.VAULT_ROLE_ID!,
    secretId: process.env.VAULT_SECRET_ID!
  },
  tls: {
    skipVerify: false // Use proper TLS in production
  }
});

await client.initialize();
```

## 🛠 Service Integration

### User Service Example

```typescript
import { createUserServiceVault } from '@transcendence/shared-utils';

class UserService {
  private vault = createUserServiceVault();

  async initialize() {
    await this.vault.initialize();
  }

  async setupDatabase() {
    // Get database configuration with automatic fallback to env vars
    const dbConfig = await this.vault.getDatabaseConfig();
    
    // Configure your database connection
    this.db = new DatabaseConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
      password: dbConfig.password,
      ssl: dbConfig.ssl
    });
  }

  async setupJWT() {
    const jwtConfig = await this.vault.getJWTConfig();
    
    this.jwtSecret = jwtConfig.secretKey;
    this.jwtIssuer = jwtConfig.issuer;
    this.jwtExpiration = jwtConfig.expirationHours;
  }

  async getOAuthCredentials() {
    const apiConfig = await this.vault.getAPIConfig();
    
    return {
      google: {
        clientId: apiConfig.googleClientId,
        clientSecret: apiConfig.googleClientSecret
      },
      github: {
        clientId: apiConfig.githubClientId,
        clientSecret: apiConfig.githubClientSecret
      }
    };
  }
}
```

### Game Service Example

```typescript
import { createGameServiceVault } from '@transcendence/shared-utils';

class GameService {
  private vault = createGameServiceVault();

  async initialize() {
    await this.vault.initialize();
  }

  async setupGameConfiguration() {
    // Get game-specific configuration
    const gameConfig = await this.vault.getServiceConfig();
    
    this.websocketSecret = gameConfig.websocket_secret;
    this.matchTimeout = parseInt(gameConfig.match_timeout_minutes) * 60 * 1000;
    this.maxConcurrentGames = parseInt(gameConfig.max_concurrent_games);
  }

  async getWebSocketSecret() {
    // Get specific secret with fallback
    return await this.vault.getSecretWithDefault(
      'secret/game/config',
      'websocket_secret',
      'dev-websocket-secret', // fallback for development
      'WEBSOCKET_SECRET' // environment variable fallback
    );
  }
}
```

### API Gateway Example

```typescript
import { createAPIGatewayVault } from '@transcendence/shared-utils';

class APIGateway {
  private vault = createAPIGatewayVault();

  async initialize() {
    await this.vault.initialize();
    
    // Check Vault health at startup
    const isHealthy = await this.vault.isVaultHealthy();
    if (!isHealthy) {
      console.warn('Vault is not healthy, using environment variable fallbacks');
    }
  }

  async setupRatelimiting() {
    const gatewayConfig = await this.vault.getServiceConfig();
    
    this.rateLimitSecret = gatewayConfig.rate_limit_secret;
    this.corsOrigins = gatewayConfig.cors_origins?.split(',') || ['http://localhost:3000'];
  }

  async getInternalAPIKey() {
    return await this.vault.getSecret(
      'secret/gateway/config',
      'internal_api_key',
      'INTERNAL_API_KEY'
    );
  }
}
```

## ⚙️ Configuration Examples

### Development Configuration

```typescript
// .env.development
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=dev-root-token-123
VAULT_DEBUG=true
VAULT_CACHE_TTL=60
```

```typescript
import { createVaultHelper } from '@transcendence/shared-utils';

const vault = createVaultHelper('my-service', {
  database: 'secret/database/my-service',
  jwt: 'secret/jwt/auth'
}, {
  vaultConfig: {
    debug: true,
    cacheTtl: 60 // Short cache for development
  }
});
```

### Production Configuration

```typescript
// Environment variables in production
VAULT_ADDR=https://vault.company.com:8200
VAULT_ROLE_ID=role-id-from-vault-setup
VAULT_SECRET_ID=secret-id-from-vault-setup
VAULT_TIMEOUT=10000
VAULT_MAX_RETRIES=5
VAULT_CACHE_TTL=300
```

```typescript
import { ServiceVaultHelper } from '@transcendence/shared-utils';

const vault = new ServiceVaultHelper({
  serviceName: 'user-service',
  secretPaths: {
    database: 'secret/database/user-service',
    jwt: 'secret/jwt/auth',
    api: 'secret/api/oauth'
  },
  requiredSecrets: ['database', 'jwt']
});
```

### Environment Configuration

```bash
# Token authentication
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="your-vault-token"

# AppRole authentication
export VAULT_ADDR="http://localhost:8200"
export VAULT_ROLE_ID="your-role-id"
export VAULT_SECRET_ID="your-secret-id"
```

```typescript
// Automatic environment-based authentication
const vault = createUserServiceVault();
// Will automatically detect environment variables and configure authentication
```

## 🔄 Error Handling

### Graceful Degradation

```typescript
class UserService {
  private vault = createUserServiceVault();
  private dbConfig: any;

  async initialize() {
    try {
      await this.vault.initialize();
      this.dbConfig = await this.vault.getDatabaseConfig();
      console.log('✅ Using Vault for secrets');
    } catch (error) {
      console.warn('⚠️ Vault unavailable, using environment variables:', error.message);
      this.dbConfig = this.getDBConfigFromEnv();
    }
  }

  private getDBConfigFromEnv() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_DATABASE || 'transcendence',
      username: process.env.DB_USERNAME || 'user',
      password: process.env.DB_PASSWORD || 'password'
    };
  }
}
```

### Retry Logic with Circuit Breaker

```typescript
import { VaultClient, retryWithBackoff } from '@transcendence/shared-utils';

class RobustVaultService {
  private client: VaultClient;
  private circuitBreakerOpen = false;
  private lastFailure = 0;
  private failureCount = 0;

  async getSecretWithCircuitBreaker(path: string, key: string) {
    // Circuit breaker logic
    if (this.circuitBreakerOpen) {
      const timeSinceFailure = Date.now() - this.lastFailure;
      if (timeSinceFailure < 30000) { // 30 second circuit breaker
        throw new Error('Circuit breaker is open');
      } else {
        this.circuitBreakerOpen = false;
        this.failureCount = 0;
      }
    }

    try {
      return await retryWithBackoff(
        () => this.client.getSecretValue(path, key),
        3, // max retries
        1000, // base delay
        10000 // max delay
      );
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= 3) {
        this.circuitBreakerOpen = true;
        this.lastFailure = Date.now();
      }
      throw error;
    }
  }
}
```

## 🔧 Advanced Usage

### Custom Vault Client with Middleware

```typescript
import { VaultClient, VaultConfig } from '@transcendence/shared-utils';

class CustomVaultClient extends VaultClient {
  private middleware: Array<(path: string, data: any) => Promise<any>> = [];

  addMiddleware(fn: (path: string, data: any) => Promise<any>) {
    this.middleware.push(fn);
  }

  async getSecret(path: string, version?: number) {
    let result = await super.getSecret(path, version);
    
    // Apply middleware
    for (const middleware of this.middleware) {
      result = await middleware(path, result);
    }
    
    return result;
  }
}

// Usage with middleware
const client = new CustomVaultClient(config);

// Add decryption middleware
client.addMiddleware(async (path, data) => {
  if (path.includes('encrypted')) {
    data.data = await decrypt(data.data);
  }
  return data;
});

// Add validation middleware
client.addMiddleware(async (path, data) => {
  validateSecretStructure(data);
  return data;
});
```

### Secret Rotation Handling

```typescript
class RotatingSecretService {
  private vault = createUserServiceVault();
  private currentJWTSecret: string;
  private previousJWTSecret?: string;

  async initialize() {
    await this.vault.initialize();
    await this.loadJWTSecrets();
    
    // Check for secret rotation every hour
    setInterval(() => this.checkForRotation(), 3600000);
  }

  private async loadJWTSecrets() {
    const jwtConfig = await this.vault.getJWTConfig();
    
    if (this.currentJWTSecret && this.currentJWTSecret !== jwtConfig.secretKey) {
      // Secret has been rotated
      this.previousJWTSecret = this.currentJWTSecret;
      console.log('🔄 JWT secret rotated');
    }
    
    this.currentJWTSecret = jwtConfig.secretKey;
  }

  private async checkForRotation() {
    try {
      // Clear cache to force fresh fetch
      this.vault.clearCache();
      await this.loadJWTSecrets();
    } catch (error) {
      console.error('Failed to check for secret rotation:', error);
    }
  }

  verifyJWT(token: string) {
    try {
      // Try current secret first
      return jwt.verify(token, this.currentJWTSecret);
    } catch (error) {
      if (this.previousJWTSecret) {
        // Try previous secret for graceful rotation
        return jwt.verify(token, this.previousJWTSecret);
      }
      throw error;
    }
  }
}
```

### Health Monitoring and Metrics

```typescript
class VaultHealthMonitor {
  private vault = createUserServiceVault();
  private healthCheckInterval?: NodeJS.Timeout;

  async start() {
    await this.vault.initialize();
    
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  async performHealthCheck() {
    const isHealthy = await this.vault.isVaultHealthy();
    const metrics = this.vault.getMetrics();
    
    // Log metrics
    console.log('🔍 Vault Health Check:', {
      healthy: isHealthy,
      totalRequests: metrics.totalRequests,
      cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
      avgResponseTime: `${metrics.avgResponseTime.toFixed(0)}ms`,
      errorRate: `${(metrics.errorRate * 100).toFixed(1)}%`,
      lastAuth: metrics.lastAuthTime?.toISOString(),
      tokenExpiry: metrics.tokenExpiresAt?.toISOString()
    });

    // Alert on high error rate
    if (metrics.errorRate > 0.1) { // 10% error rate
      console.warn('⚠️ High Vault error rate detected');
      // Send alert to monitoring system
    }

    // Alert on low cache hit rate (might indicate issues)
    if (metrics.cacheHitRate < 0.5 && metrics.totalRequests > 10) {
      console.warn('⚠️ Low Vault cache hit rate');
    }
  }

  stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
```

## 🎯 Best Practices

### 1. **Environment-Specific Configuration**

```typescript
// config/vault.ts
export const getVaultConfig = (): VaultConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig = {
    address: process.env.VAULT_ADDR || 'http://localhost:8200',
    timeout: 5000,
    maxRetries: 3,
  };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        authMethod: 'token' as const,
        token: process.env.VAULT_TOKEN || 'dev-root-token-123',
        debug: true,
        cacheTtl: 60, // Short cache for development
        tls: { skipVerify: true }
      };
      
    case 'staging':
      return {
        ...baseConfig,
        authMethod: 'approle' as const,
        appRole: {
          roleId: process.env.VAULT_ROLE_ID!,
          secretId: process.env.VAULT_SECRET_ID!
        },
        cacheTtl: 180,
        tls: { skipVerify: false }
      };
      
    case 'production':
      return {
        ...baseConfig,
        authMethod: 'approle' as const,
        appRole: {
          roleId: process.env.VAULT_ROLE_ID!,
          secretId: process.env.VAULT_SECRET_ID!
        },
        timeout: 10000,
        maxRetries: 5,
        cacheTtl: 300,
        tls: { skipVerify: false }
      };
      
    default:
      throw new Error(`Unknown environment: ${env}`);
  }
};
```

### 2. **Graceful Startup and Shutdown**

```typescript
class ServiceWithVault {
  private vault = createUserServiceVault();
  private shutdownHandlers: Array<() => Promise<void>> = [];

  async start() {
    try {
      // Initialize Vault first
      await this.vault.initialize();
      console.log('✅ Vault initialized');
      
      // Setup other services that depend on secrets
      await this.setupDatabase();
      await this.setupAuth();
      
      // Register shutdown handler
      this.shutdownHandlers.push(() => this.vault.shutdown());
      
      // Setup graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      console.error('❌ Failed to start service:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down service...');
    
    for (const handler of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
    }
    
    process.exit(0);
  }
}
```

### 3. **Testing with Vault**

```typescript
// test/vault-mock.ts
export class MockVaultHelper {
  private secrets = new Map<string, any>();

  async initialize() {
    // Mock initialization
  }

  async getDatabaseConfig() {
    return {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_password',
      ssl: false
    };
  }

  async getJWTConfig() {
    return {
      secretKey: 'test-jwt-secret',
      issuer: 'test-issuer',
      expirationHours: 24
    };
  }

  setSecret(path: string, key: string, value: any) {
    this.secrets.set(`${path}:${key}`, value);
  }

  async getSecret(path: string, key: string) {
    return this.secrets.get(`${path}:${key}`);
  }
}
```

```typescript
// test/user-service.test.ts
import { MockVaultHelper } from './vault-mock';

describe('UserService', () => {
  let userService: UserService;
  let mockVault: MockVaultHelper;

  beforeEach(() => {
    mockVault = new MockVaultHelper();
    userService = new UserService(mockVault);
  });

  it('should initialize with database config', async () => {
    await userService.initialize();
    
    expect(userService.dbConfig).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_password',
      ssl: false
    });
  });
});
```

### 4. **Monitoring and Alerting**

```typescript
// monitoring/vault-monitor.ts
export class VaultMonitor {
  private metrics = {
    secretsFetched: 0,
    cacheHits: 0,
    errors: 0,
    lastHealthCheck: new Date()
  };

  async collectMetrics(vault: ServiceVaultHelper) {
    const vaultMetrics = vault.getMetrics();
    
    // Increment our metrics
    this.metrics.secretsFetched += vaultMetrics.totalRequests;
    this.metrics.cacheHits += vaultMetrics.totalRequests * vaultMetrics.cacheHitRate;
    
    // Export to monitoring system (Prometheus, DataDog, etc.)
    this.exportMetrics({
      vault_requests_total: this.metrics.secretsFetched,
      vault_cache_hit_ratio: vaultMetrics.cacheHitRate,
      vault_error_rate: vaultMetrics.errorRate,
      vault_response_time_avg: vaultMetrics.avgResponseTime
    });
  }

  private exportMetrics(metrics: Record<string, number>) {
    // Export to your monitoring system
    console.log('📊 Vault Metrics:', metrics);
  }
}
```

This comprehensive guide covers all aspects of using the Vault client in your microservices. The client provides production-ready features including automatic retries, caching, health checks, and graceful fallbacks to environment variables.