/**
 * Vault Client Interface and Types
 * 
 * Production-ready TypeScript interfaces for Vault integration
 * across all Transcendence microservices
 */

export interface VaultConfig {
    /** Vault server address (e.g., https://vault.company.com:8200) */
    address: string;

    /** Authentication method: 'token' | 'approle' */
    authMethod: 'token' | 'approle';

    /** Direct token for token auth method */
    token?: string;

    /** AppRole authentication credentials */
    appRole?: {
        roleId: string;
        secretId: string;
        mountPath?: string; // default: 'approle'
    };

    /** Request timeout in milliseconds */
    timeout?: number; // default: 5000

    /** Maximum retry attempts for failed requests */
    maxRetries?: number; // default: 3

    /** Base delay between retries in milliseconds */
    retryDelay?: number; // default: 1000

    /** Enable caching of secrets (with TTL) */
    enableCache?: boolean; // default: true

    /** Cache TTL in seconds */
    cacheTtl?: number; // default: 300 (5 minutes)

    /** TLS configuration */
    tls?: {
        /** Skip TLS verification (dev only) */
        skipVerify?: boolean;
        /** CA certificate path */
        caCert?: string;
        /** Client certificate path */
        clientCert?: string;
        /** Client key path */
        clientKey?: string;
    };

    /** Namespace (Vault Enterprise) */
    namespace?: string;

    /** Enable detailed logging */
    debug?: boolean;
}

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

export interface VaultAuthResponse {
    /** Client token */
    clientToken: string;

    /** Token policies */
    policies: string[];

    /** Token metadata */
    metadata: Record<string, string>;

    /** Lease duration in seconds */
    leaseDuration: number;

    /** Whether token is renewable */
    renewable: boolean;

    /** Token accessor */
    accessor: string;
}

export interface VaultListResponse {
    /** List of keys */
    keys: string[];
}

export interface VaultError extends Error {
    /** HTTP status code */
    status?: number;

    /** Vault error details */
    errors?: string[];

    /** Request URL that failed */
    url?: string;

    /** Whether error is retryable */
    retryable?: boolean;
}

export interface CacheEntry<T = any> {
    /** Cached data */
    data: T;

    /** Expiration timestamp */
    expiresAt: number;

    /** Cache creation timestamp */
    createdAt: number;
}

export interface VaultMetrics {
    /** Total requests made */
    totalRequests: number;

    /** Cache hit rate */
    cacheHitRate: number;

    /** Average response time */
    avgResponseTime: number;

    /** Number of authentication renewals */
    authRenewals: number;

    /** Error rate */
    errorRate: number;

    /** Last successful authentication */
    lastAuthTime?: Date;

    /** Current token expiration */
    tokenExpiresAt?: Date;
}

/**
 * Vault Client Interface
 */
export interface IVaultClient {
    /**
     * Initialize the client and authenticate
     */
    initialize(): Promise<void>;

    /**
     * Get a secret from Vault
     * @param path Secret path (e.g., 'secret/database/config')
     * @param version Specific version to retrieve (optional)
     */
    getSecret(path: string, version?: number): Promise<VaultSecret>;

    /**
     * Get a specific key from a secret
     * @param path Secret path
     * @param key Key within the secret
     * @param defaultValue Default value if key not found
     */
    getSecretValue<T = string>(
        path: string,
        key: string,
        defaultValue?: T
    ): Promise<T>;

    /**
     * Store a secret in Vault
     * @param path Secret path
     * @param data Secret data
     */
    putSecret(path: string, data: Record<string, any>): Promise<void>;

    /**
     * Delete a secret from Vault
     * @param path Secret path
     * @param versions Specific versions to delete (optional)
     */
    deleteSecret(path: string, versions?: number[]): Promise<void>;

    /**
     * List secrets at a path
     * @param path Path to list
     */
    listSecrets(path: string): Promise<VaultListResponse>;

    /**
     * Renew the current authentication token
     */
    renewToken(): Promise<void>;

    /**
     * Check if the client is healthy and authenticated
     */
    healthCheck(): Promise<boolean>;

    /**
     * Get client metrics and statistics
     */
    getMetrics(): VaultMetrics;

    /**
     * Clear the secret cache
     */
    clearCache(): void;

    /**
     * Shutdown the client gracefully
     */
    shutdown(): Promise<void>;
}

/**
 * Service-specific configuration helpers
 */
export interface ServiceVaultConfig {
    /** Service name for logging and metrics */
    serviceName: string;

    /** Common secret paths for this service */
    secretPaths: {
        database?: string;
        jwt?: string;
        api?: string;
        config?: string;
    };

    /** Environment variable fallbacks */
    fallbacks?: {
        [secretKey: string]: string; // env var name
    };

    /** Required secrets that must be present */
    requiredSecrets?: string[];
}

/**
 * Environment variable configuration
 */
export interface EnvVaultConfig {
    VAULT_ADDR: string;
    VAULT_TOKEN?: string;
    VAULT_ROLE_ID?: string;
    VAULT_SECRET_ID?: string;
    VAULT_NAMESPACE?: string;
    VAULT_SKIP_VERIFY?: string;
    VAULT_TIMEOUT?: string;
    VAULT_MAX_RETRIES?: string;
    VAULT_CACHE_TTL?: string;
    VAULT_DEBUG?: string;
}