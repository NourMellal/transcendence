/**
 * 
 * Only essential interfaces needed for basic Vault operations
 */

/**
 * Vault configuration (simplified - token auth only)
 */
export interface VaultConfig {
    /** Vault server address */
    address: string;

    /** Authentication token */
    token: string;

    /** Request timeout in milliseconds (default: 5000) */
    timeout?: number;
}

/**
 * Vault secret response
 */
export interface VaultSecret {
    /** Secret data */
    data: Record<string, any>;
}

/**
 * Service-specific Vault configuration
 */
export interface ServiceVaultConfig {
    /** Service name */
    serviceName: string;

    /** Secret paths for this service */
    secretPaths: {
        database?: string;
        jwt?: string;
        api?: string;
        config?: string;
    };
}

/**
 * Database configuration from Vault
 */
export interface DatabaseConfig {
    host: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
    connectionPoolSize?: number;
}

/**
 * JWT configuration from Vault
 */
export interface JWTConfig {
    secretKey: string;
    issuer: string;
    expirationHours: number;
    refreshExpirationHours?: number;
}

/**
 * API/OAuth configuration from Vault
 */
export interface APIConfig {
    [key: string]: string;
}
