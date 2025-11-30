/**
 * 
 * Provides easy-to-use wrappers for services to fetch their secrets from Vault
 * with automatic fallback to environment variables
 */

import { VaultClient, createVaultClientFromEnv } from './client';
import type {
    ServiceVaultConfig,
    DatabaseConfig,
    JWTConfig,
    APIConfig,
} from './types';

export class ServiceVaultHelper {
    private client: VaultClient;
    private serviceConfig: ServiceVaultConfig;
    private initialized = false;

    constructor(serviceConfig: ServiceVaultConfig) {
        this.client = createVaultClientFromEnv();
        this.serviceConfig = serviceConfig;
    }

    /**
     * Initialize Vault connection
     */
    async initialize(): Promise<void> {
        try {
            await this.client.initialize();
            this.initialized = true;
            console.log(`[${this.serviceConfig.serviceName}] Vault helper initialized`);
        } catch (error) {
            console.warn(
                `[${this.serviceConfig.serviceName}] Failed to initialize Vault, using environment fallback:`,
                (error as Error).message
            );
            this.initialized = false;
        }
    }

    /**
     * Get database configuration
     */
    async getDatabaseConfig(): Promise<DatabaseConfig> {
        const path = this.serviceConfig.secretPaths.database;

        if (!path || !this.initialized) {
            return this.getDatabaseConfigFromEnv();
        }

        try {
            const secret = await this.client.getSecret(path);
            return {
                host: secret.data.host,
                port: secret.data.port ? parseInt(secret.data.port) : undefined,
                database: secret.data.database,
                username: secret.data.username,
                password: secret.data.password,
                ssl: secret.data.ssl_mode !== 'disable',
                connectionPoolSize: secret.data.connection_pool_size
                    ? parseInt(secret.data.connection_pool_size)
                    : 5,
            };
        } catch (error) {
            console.warn(
                `[${this.serviceConfig.serviceName}] Failed to get DB config from Vault, using environment:`,
                (error as Error).message
            );
            return this.getDatabaseConfigFromEnv();
        }
    }

    /**
     * Get JWT configuration
     */
    async getJWTConfig(): Promise<JWTConfig> {
        const path = this.serviceConfig.secretPaths.jwt;

        if (!path || !this.initialized) {
            return this.getJWTConfigFromEnv();
        }

        try {
            const secret = await this.client.getSecret(path);
            return {
                secretKey: secret.data.secret_key,
                issuer: secret.data.issuer,
                expirationHours: parseInt(secret.data.expiration_hours || '24'),
                refreshExpirationHours: secret.data.refresh_expiration_hours
                    ? parseInt(secret.data.refresh_expiration_hours)
                    : undefined,
            };
        } catch (error) {
            console.warn(
                `[${this.serviceConfig.serviceName}] Failed to get JWT config from Vault, using environment:`,
                (error as Error).message
            );
            return this.getJWTConfigFromEnv();
        }
    }

    /**
     * Get API/OAuth configuration
     */
    async getAPIConfig(): Promise<APIConfig> {
        const path = this.serviceConfig.secretPaths.api;

        if (!path || !this.initialized) {
            return this.getAPIConfigFromEnv();
        }

        try {
            const secret = await this.client.getSecret(path);
            return secret.data;
        } catch (error) {
            console.warn(
                `[${this.serviceConfig.serviceName}] Failed to get API config from Vault, using environment:`,
                (error as Error).message
            );
            return this.getAPIConfigFromEnv();
        }
    }

    /**
     * Get service-specific configuration
     */
    async getServiceConfig(): Promise<Record<string, any>> {
        const path = this.serviceConfig.secretPaths.config;

        if (!path || !this.initialized) {
            return {};
        }

        try {
            const secret = await this.client.getSecret(path);
            return secret.data;
        } catch (error) {
            console.warn(
                `[${this.serviceConfig.serviceName}] Failed to get service config from Vault:`,
                (error as Error).message
            );
            return {};
        }
    }

    /**
     * Get shared internal API key (single source of truth)
     */
    async getInternalApiKey(): Promise<string | null> {
        const path = this.serviceConfig.secretPaths.internalApiKey;

        if (!path || !this.initialized) {
            return this.getInternalApiKeyFromEnv();
        }

        try {
            const secret = await this.client.getSecret(path);
            const key = this.extractInternalApiKey(secret.data);

            if (!key) {
                console.warn(
                    `[${this.serviceConfig.serviceName}] Internal API key missing at ${path}, using environment fallback.`
                );
                return this.getInternalApiKeyFromEnv();
            }

            return key;
        } catch (error) {
            console.warn(
                `[${this.serviceConfig.serviceName}] Failed to get internal API key from Vault, using environment:`,
                (error as Error).message
            );
            return this.getInternalApiKeyFromEnv();
        }
    }

    /**
     * Check if Vault is healthy
     */
    async isVaultHealthy(): Promise<boolean> {
        try {
            await this.client.initialize();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Shutdown (cleanup)
     */
    async shutdown(): Promise<void> {
        this.client.clearCache();
    }

    // Environment variable fallbacks

    private getDatabaseConfigFromEnv(): DatabaseConfig {
        return {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
            database: process.env.DB_NAME,
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: process.env.DB_SSL === 'true',
            connectionPoolSize: 5,
        };
    }

    private getJWTConfigFromEnv(): JWTConfig {
        return {
            secretKey: process.env.JWT_SECRET || 'fallback-jwt-secret-for-development',
            issuer: process.env.JWT_ISSUER || 'transcendence',
            expirationHours: parseFloat(process.env.JWT_EXPIRATION_HOURS || '0.25'),
        };
    }

    private getAPIConfigFromEnv(): APIConfig {
        return {
            google_client_id: process.env.GOOGLE_CLIENT_ID || '',
            google_client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            '42_client_id': process.env.OAUTH_42_CLIENT_ID || '',
            '42_client_secret': process.env.OAUTH_42_CLIENT_SECRET || '',
        };
    }

    private getInternalApiKeyFromEnv(): string | null {
        const key = process.env.INTERNAL_API_KEY;
        return key && key.trim().length > 0 ? key.trim() : null;
    }

    private extractInternalApiKey(data: Record<string, any>): string | null {
        const candidates = ['key', 'internal_api_key', 'internalApiKey', 'INTERNAL_API_KEY'];

        for (const candidate of candidates) {
            const value = data[candidate];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value.trim();
            }
        }

        return null;
    }
}

/**
 * Create Vault helper for specific service
 */
export function createVaultHelper(
    serviceName: string,
    secretPaths: ServiceVaultConfig['secretPaths']
): ServiceVaultHelper {
    return new ServiceVaultHelper({
        serviceName,
        secretPaths,
    });
}

// Pre-configured helpers for each service

export const createUserServiceVault = () =>
    createVaultHelper('user-service', {
        database: 'secret/database/user-service',
        jwt: 'secret/jwt/auth',
        api: 'secret/api/oauth',
        config: 'secret/security/config',
        internalApiKey: 'secret/shared/internal-api-key',
    });

export const createGameServiceVault = () =>
    createVaultHelper('game-service', {
        database: 'secret/database/game-service',
        jwt: 'secret/jwt/game',
        config: 'secret/game/config',
        internalApiKey: 'secret/shared/internal-api-key',
    });

export const createChatServiceVault = () =>
    createVaultHelper('chat-service', {
        database: 'secret/database/chat-service',
        jwt: 'secret/jwt/auth',
        config: 'secret/chat/config',
        internalApiKey: 'secret/shared/internal-api-key',
    });

export const createTournamentServiceVault = () =>
    createVaultHelper('tournament-service', {
        database: 'secret/database/tournament-service',
        jwt: 'secret/jwt/auth',
        config: 'secret/game/config',
        internalApiKey: 'secret/shared/internal-api-key',
    });

export const createAPIGatewayVault = () =>
    createVaultHelper('api-gateway', {
        jwt: 'secret/jwt/auth',
        api: 'secret/api/oauth',
        config: 'secret/gateway/config',
        internalApiKey: 'secret/shared/internal-api-key',
    });
