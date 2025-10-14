```typescript
import { createUserServiceVault } from '@transcendence/shared-utils';




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

### 2. API Gateway
```typescript
import { createAPIGatewayVault } from '@transcendence/shared-utils';


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

### 3. Any Service
```typescript
import { createVaultHelper } from '@transcendence/shared-utils';

const vault = createVaultHelper('my-service', {
    jwt: 'secret/jwt/auth',
    database: 'secret/database/my-service',
  jwt: 'secret/jwt/auth'
}, {
  vaultConfig: {
    debug: true,
    cacheTtl: 60 // Short cache for development
  }
});

await vault.initialize();
const jwt = await vault.getJWTConfig();
```





```bash
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