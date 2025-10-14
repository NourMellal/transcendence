/**
 * Service-Specific Vault Helper
 * 
 * Simplified wrapper for microservices to easily integrate with Vault
 * while maintaining fallback to environment variables
 */

import { VaultClient } from './client.js';
import { VaultConfig, ServiceVaultConfig, EnvVaultConfig } from './types.js';

export class ServiceVaultHelper {
    private client: VaultClient;
    private serviceConfig: ServiceVaultConfig;
    private initialized = false;

    constructor(serviceConfig: ServiceVaultConfig, vaultConfig?: Partial<VaultConfig>) {
        this.serviceConfig = serviceConfig;

        // Build configuration from environment and overrides
        const config = this.buildConfigFromEnv(vaultConfig);
        this.client = new VaultClient(config);
    }

    /**
     * Initialize the vault helper
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            await this.client.initialize();
            this.initialized = true;
            this.log('Vault helper initialized successfully');
        } catch (error) {
            this.log('Failed to initialize Vault, will use environment variables:', error);
            // Don't throw - allow graceful degradation to env vars
        }
    }

    /**
     * Get database configuration with fallback to environment variables
     */
    async getDatabaseConfig(): Promise<{
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
        ssl?: boolean;
        connectionPoolSize?: number;
    }> {
        const secretPath = this.serviceConfig.secretPaths.database;

        if (this.initialized && secretPath) {
            try {
                const secret = await this.client.getSecret(secretPath);
                return {
                    host: secret.data.host,
                    port: parseInt(secret.data.port) || 5432,
                    database: secret.data.database,
                    username: secret.data.username,
                    password: secret.data.password,
                    ssl: secret.data.ssl_mode !== 'disable',
                    connectionPoolSize: parseInt(secret.data.connection_pool_size) || 10,
                };
            } catch (error) {
                this.log('Failed to get database config from Vault, using environment:', error);
            }
        }

        // Fallback to environment variables
        return {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_DATABASE || 'transcendence',
            username: process.env.DB_USERNAME || 'user',
            password: process.env.DB_PASSWORD || 'password',
            ssl: process.env.DB_SSL === 'true',
            connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
        };
    }

    /**
     * Get JWT configuration with fallback
     */
    async getJWTConfig(): Promise<{
        secretKey: string;
        issuer: string;
        expirationHours: number;
        refreshSecretKey?: string;
        refreshExpirationHours?: number;
    }> {
        const secretPath = this.serviceConfig.secretPaths.jwt;

        if (this.initialized && secretPath) {
            try {
                const secret = await this.client.getSecret(secretPath);
                return {
                    secretKey: secret.data.secret_key,
                    issuer: secret.data.issuer,
                    expirationHours: parseInt(secret.data.expiration_hours) || 24,
                    refreshSecretKey: secret.data.refresh_secret_key,
                    refreshExpirationHours: parseInt(secret.data.refresh_expiration_hours) || 168,
                };
            } catch (error) {
                this.log('Failed to get JWT config from Vault, using environment:', error);
            }
        }

        // Fallback to environment variables
        return {
            secretKey: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
            issuer: process.env.JWT_ISSUER || 'transcendence',
            expirationHours: parseInt(process.env.JWT_EXPIRATION_HOURS || '24'),
            refreshSecretKey: process.env.JWT_REFRESH_SECRET,
            refreshExpirationHours: parseInt(process.env.JWT_REFRESH_EXPIRATION_HOURS || '168'),
        };
    }

    /**
     * Get API configuration (OAuth, external services, etc.)
     */
    async getAPIConfig(): Promise<Record<string, any>> {
        const secretPath = this.serviceConfig.secretPaths.api;

        if (this.initialized && secretPath) {
            try {
                const secret = await this.client.getSecret(secretPath);
                return secret.data;
            } catch (error) {
                this.log('Failed to get API config from Vault, using environment:', error);
            }
        }

        // Fallback to environment variables for common API configs
        return {
            googleClientId: process.env.GOOGLE_CLIENT_ID,
            googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
            githubClientId: process.env.GITHUB_CLIENT_ID,
            githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
            smtpHost: process.env.SMTP_HOST,
            smtpPort: process.env.SMTP_PORT,
            smtpUser: process.env.SMTP_USER,
            smtpPassword: process.env.SMTP_PASSWORD,
        };
    }

    /**
     * Get service-specific configuration
     */
    async getServiceConfig(): Promise<Record<string, any>> {
        const secretPath = this.serviceConfig.secretPaths.config;

        if (this.initialized && secretPath) {
            try {
                const secret = await this.client.getSecret(secretPath);
                return secret.data;
            } catch (error) {
                this.log('Failed to get service config from Vault, using environment:', error);
            }
        }

        // Return empty object if no config path or fallback
        return {};
    }

    /**
     * Get a specific secret value with environment variable fallback
     */
    async getSecret(vaultPath: string, vaultKey: string, envVar?: string): Promise<string | undefined> {
        if (this.initialized) {
            try {
                const value = await this.client.getSecretValue(vaultPath, vaultKey);
                return value;
            } catch (error) {
                this.log(`Failed to get secret ${vaultPath}:${vaultKey} from Vault:`, error);
            }
        }

        // Fallback to environment variable if provided
        if (envVar) {
            return process.env[envVar];
        }

        return undefined;
    }

    /**
     * Get a secret with a default value
     */
    async getSecretWithDefault<T = string>(
        vaultPath: string,
        vaultKey: string,
        defaultValue: T,
        envVar?: string
    ): Promise<T> {
        const value = await this.getSecret(vaultPath, vaultKey, envVar);
        return value !== undefined ? (value as unknown as T) : defaultValue;
    }

    /**
     * Check if Vault is healthy and accessible
     */
    async isVaultHealthy(): Promise<boolean> {
        if (!this.initialized) {
            return false;
        }

        return await this.client.healthCheck();
    }

    /**
     * Get Vault client metrics
     */
    getMetrics() {
        return this.client.getMetrics();
    }

    /**
     * Gracefully shutdown the helper
     */
    async shutdown(): Promise<void> {
        await this.client.shutdown();
        this.initialized = false;
    }

    /**
     * Build Vault configuration from environment variables and overrides
     */
    private buildConfigFromEnv(overrides?: Partial<VaultConfig>): VaultConfig {
        const env = process.env;

        // Determine authentication method
        let authMethod: 'token' | 'approle' = 'token';
        let authConfig: any = {};

        if (env.VAULT_ROLE_ID && env.VAULT_SECRET_ID) {
            authMethod = 'approle';
            authConfig = {
                appRole: {
                    roleId: env.VAULT_ROLE_ID,
                    secretId: env.VAULT_SECRET_ID,
                },
            };
        } else if (env.VAULT_TOKEN) {
            authMethod = 'token';
            authConfig = { token: env.VAULT_TOKEN };
        } else {
            // Try to find token in common locations
            const tokenSources = [
                process.env.VAULT_TOKEN,
                process.env.VAULT_DEV_ROOT_TOKEN_ID, // Development token
            ];

            const token = tokenSources.find(t => t);
            if (token) {
                authConfig = { token };
            } else {
                throw new Error('No Vault authentication method configured. Set VAULT_TOKEN or VAULT_ROLE_ID/VAULT_SECRET_ID');
            }
        }

        const config: VaultConfig = {
            address: env.VAULT_ADDR || 'http://localhost:8200',
            authMethod,
            ...authConfig,
            timeout: env.VAULT_TIMEOUT ? parseInt(env.VAULT_TIMEOUT) : 5000,
            maxRetries: env.VAULT_MAX_RETRIES ? parseInt(env.VAULT_MAX_RETRIES) : 3,
            cacheTtl: env.VAULT_CACHE_TTL ? parseInt(env.VAULT_CACHE_TTL) : 300,
            debug: env.VAULT_DEBUG === 'true',
            namespace: env.VAULT_NAMESPACE,
            tls: {
                skipVerify: env.VAULT_SKIP_VERIFY === 'true',
            },
            ...overrides,
        };

        return config;
    }

    private log(message: string, ...args: any[]): void {
        console.log(`[${this.serviceConfig.serviceName}:Vault] ${message}`, ...args);
    }
}

/**
 * Factory function to create service-specific vault helpers
 */
export function createVaultHelper(
    serviceName: string,
    secretPaths: ServiceVaultConfig['secretPaths'],
    options?: {
        requiredSecrets?: string[];
        fallbacks?: Record<string, string>;
        vaultConfig?: Partial<VaultConfig>;
    }
): ServiceVaultHelper {
    const serviceConfig: ServiceVaultConfig = {
        serviceName,
        secretPaths,
        requiredSecrets: options?.requiredSecrets,
        fallbacks: options?.fallbacks,
    };

    return new ServiceVaultHelper(serviceConfig, options?.vaultConfig);
}

/**
 * Pre-configured helpers for each service
 */
export const createUserServiceVault = () => createVaultHelper(
    'user-service',
    {
        database: 'secret/database/user-service',
        jwt: 'secret/jwt/auth',
        api: 'secret/api/oauth',
        config: 'secret/security/config',
    }
);

export const createGameServiceVault = () => createVaultHelper(
    'game-service',
    {
        database: 'secret/database/game-service',
        jwt: 'secret/jwt/game',
        config: 'secret/game/config',
    }
);

export const createChatServiceVault = () => createVaultHelper(
    'chat-service',
    {
        database: 'secret/database/chat-service',
        jwt: 'secret/jwt/auth',
        config: 'secret/chat/config',
    }
);

export const createTournamentServiceVault = () => createVaultHelper(
    'tournament-service',
    {
        database: 'secret/database/tournament-service',
        jwt: 'secret/jwt/auth',
        config: 'secret/game/config',
    }
);

export const createAPIGatewayVault = () => createVaultHelper(
    'api-gateway',
    {
        jwt: 'secret/jwt/auth',
        api: 'secret/api/oauth',
        config: 'secret/gateway/config',
    }
);