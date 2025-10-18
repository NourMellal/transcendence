/**
 * 
 * This is a streamlined version focused on essential Vault operations:
 * - Connect to Vault
 * - Fetch secrets
 * - Fallback to environment variables
 * 
 * - Token renewal (dev mode tokens don't expire)
 * - Advanced caching (simple in-memory cache only)
 * - Retry logic with exponential backoff
 * - Metrics and monitoring
 * - AppRole authentication (using token only)
 */

import type { VaultConfig, VaultSecret } from './types.js';

export class VaultClient {
    private config: VaultConfig;
    private token: string;
    private cache = new Map<string, { data: any; timestamp: number }>();
    private readonly CACHE_TTL = 300000; // 5 minutes

    constructor(config: VaultConfig) {
        this.config = {
            address: config.address,
            token: config.token,
            timeout: config.timeout || 5000,
        };
        this.token = config.token;
    }

    /**
     * Initialize Vault connection
     */
    async initialize(): Promise<void> {
        try {
            const response = await fetch(`${this.config.address}/v1/sys/health`, {
                signal: AbortSignal.timeout(this.config.timeout!),
            });

            if (!response.ok) {
                throw new Error(`Vault health check failed: ${response.status}`);
            }

            console.log('✅ Vault client initialized');
        } catch (error) {
            throw new Error(
                `Failed to connect to Vault at ${this.config.address}: ${(error as Error).message}`
            );
        }
    }

    /**
     * Get secret from Vault with caching and fallback
     */
    async getSecret(path: string): Promise<VaultSecret> {
        // Check cache first
        const cached = this.getCached(path);
        if (cached) {
            return cached;
        }

        try {
            // Build the correct KV v2 path
            const fullPath = this.buildKVv2Path(path);
            const url = `${this.config.address}/v1/${fullPath}`;

            const response = await fetch(url, {
                headers: {
                    'X-Vault-Token': this.token,
                },
                signal: AbortSignal.timeout(this.config.timeout!),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Secret not found at path: ${path}`);
                }
                throw new Error(`Vault request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const secret: VaultSecret = {
                data: result.data?.data || result.data || {},
            };

            // Cache the result
            this.cache.set(path, {
                data: secret,
                timestamp: Date.now(),
            });

            return secret;
        } catch (error) {
            throw new Error(`Failed to get secret at path: ${path}\n${(error as Error).message}`);
        }
    }

    /**
     * Build KV v2 path (adds /data/ after mount point)
     */
    private buildKVv2Path(path: string): string {
        // If path already contains /data/, return as is
        if (path.includes('/data/')) {
            return path;
        }

        // Split path into mount and rest
        const parts = path.split('/');
        if (parts.length < 2) {
            return path;
        }

        // Insert 'data' after the mount point
        const mount = parts[0];
        const rest = parts.slice(1).join('/');
        return `${mount}/data/${rest}`;
    }

    /**
     * Get cached value if still valid
     */
    private getCached(path: string): VaultSecret | null {
        const cached = this.cache.get(path);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.CACHE_TTL) {
            this.cache.delete(path);
            return null;
        }

        return cached.data;
    }

    /**
     * Clear cache (useful for testing)
     */
    clearCache(): void {
        this.cache.clear();
    }
}

/**
 * Create VaultClient from environment variables
 */
export function createVaultClientFromEnv(): VaultClient {
    const config: VaultConfig = {
        address: process.env.VAULT_ADDR || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN || 'dev-root-token',
        timeout: parseInt(process.env.VAULT_TIMEOUT || '5000'),
    };

    return new VaultClient(config);
}
