/**
 * Vault Utility Functions
 * 
 * Helper functions for common Vault operations and health checks
 */

import { VaultClient } from './client.js';
import { VaultConfig } from './types.js';

/**
 * Create a Vault client and ensure it's healthy before returning
 */
export async function createHealthyVaultClient(
    config: VaultConfig,
    maxWaitTime = 30000
): Promise<VaultClient> {
    const client = new VaultClient(config);

    await client.initialize();

    // Wait for vault to be healthy
    await waitForVault(client, maxWaitTime);

    return client;
}

/**
 * Wait for Vault to become healthy with exponential backoff
 */
export async function waitForVault(
    client: VaultClient,
    maxWaitTime = 30000,
    initialDelay = 1000
): Promise<void> {
    const startTime = Date.now();
    let delay = initialDelay;

    while (Date.now() - startTime < maxWaitTime) {
        try {
            const isHealthy = await client.healthCheck();
            if (isHealthy) {
                return;
            }
        } catch (error) {
            // Continue waiting
        }

        console.log(`Waiting for Vault to be healthy... (${Math.round((Date.now() - startTime) / 1000)}s)`);

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 5000); // Exponential backoff, max 5 seconds
    }

    throw new Error(`Vault did not become healthy within ${maxWaitTime}ms`);
}

/**
 * Validate Vault configuration
 */
export function validateVaultConfig(config: Partial<VaultConfig>): string[] {
    const errors: string[] = [];

    if (!config.address) {
        errors.push('Vault address is required');
    } else if (!config.address.startsWith('http')) {
        errors.push('Vault address must include protocol (http/https)');
    }

    if (!config.authMethod) {
        errors.push('Authentication method is required');
    }

    switch (config.authMethod) {
        case 'token':
            if (!config.token) {
                errors.push('Token is required for token authentication');
            }
            break;
        case 'approle':
            if (!config.appRole?.roleId) {
                errors.push('Role ID is required for AppRole authentication');
            }
            if (!config.appRole?.secretId) {
                errors.push('Secret ID is required for AppRole authentication');
            }
            break;
    }

    return errors;
}

/**
 * Build Vault configuration from environment variables
 */
export function buildVaultConfigFromEnv(): VaultConfig {
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
        throw new Error('No Vault authentication method configured');
    }

    const config: VaultConfig = {
        address: env.VAULT_ADDR || 'http://localhost:8200',
        authMethod,
        ...authConfig,
        timeout: env.VAULT_TIMEOUT ? parseInt(env.VAULT_TIMEOUT) : 5000,
        maxRetries: env.VAULT_MAX_RETRIES ? parseInt(env.VAULT_MAX_RETRIES) : 3,
        retryDelay: env.VAULT_RETRY_DELAY ? parseInt(env.VAULT_RETRY_DELAY) : 1000,
        enableCache: env.VAULT_ENABLE_CACHE !== 'false',
        cacheTtl: env.VAULT_CACHE_TTL ? parseInt(env.VAULT_CACHE_TTL) : 300,
        debug: env.VAULT_DEBUG === 'true',
        namespace: env.VAULT_NAMESPACE,
        tls: {
            skipVerify: env.VAULT_SKIP_VERIFY === 'true',
            caCert: env.VAULT_CA_CERT,
            clientCert: env.VAULT_CLIENT_CERT,
            clientKey: env.VAULT_CLIENT_KEY,
        },
    };

    const errors = validateVaultConfig(config);
    if (errors.length > 0) {
        throw new Error(`Invalid Vault configuration: ${errors.join(', ')}`);
    }

    return config;
}

/**
 * Create a secret path for KV v2 engine
 */
export function createKVv2Path(path: string, operation?: 'data' | 'metadata' | 'delete'): string {
    if (!path.startsWith('secret/')) {
        path = `secret/${path}`;
    }

    const basePath = path.replace('secret/', '');

    switch (operation) {
        case 'metadata':
            return `secret/metadata/${basePath}`;
        case 'delete':
            return `secret/delete/${basePath}`;
        case 'data':
        default:
            return `secret/data/${basePath}`;
    }
}

/**
 * Parse Vault secret path to extract engine and path components
 */
export function parseSecretPath(fullPath: string): {
    engine: string;
    path: string;
    isKVv2: boolean;
} {
    const parts = fullPath.split('/');
    const engine = parts[0];
    const path = parts.slice(1).join('/');

    return {
        engine,
        path,
        isKVv2: engine === 'secret',
    };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
                throw lastError;
            }

            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT') {
        return true;
    }

    // HTTP errors
    if (error.status) {
        return error.status >= 500 || error.status === 429;
    }

    return false;
}

/**
 * Mask sensitive data in logs
 */
export function maskSensitiveData(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const sensitiveKeys = [
        'token', 'password', 'secret', 'key', 'auth', 'credential',
        'jwt', 'bearer', 'authorization', 'secret_id', 'role_id'
    ];

    const masked = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sensitive =>
            lowerKey.includes(sensitive)
        );

        if (isSensitive && typeof value === 'string') {
            (masked as any)[key] = '***MASKED***';
        } else if (typeof value === 'object' && value !== null) {
            (masked as any)[key] = maskSensitiveData(value);
        } else {
            (masked as any)[key] = value;
        }
    }

    return masked;
}

/**
 * Create a safe logger that masks sensitive data
 */
export function createSafeLogger(prefix?: string) {
    const logPrefix = prefix ? `[${prefix}] ` : '';

    return {
        log: (message: string, ...args: any[]) => {
            const safeArgs = args.map(maskSensitiveData);
            console.log(`${logPrefix}${message}`, ...safeArgs);
        },
        warn: (message: string, ...args: any[]) => {
            const safeArgs = args.map(maskSensitiveData);
            console.warn(`${logPrefix}${message}`, ...safeArgs);
        },
        error: (message: string, ...args: any[]) => {
            const safeArgs = args.map(maskSensitiveData);
            console.error(`${logPrefix}${message}`, ...safeArgs);
        },
    };
}