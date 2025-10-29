/**
 * Simple Vault client using node-vault
 * Rewritten from scratch for simplicity and reliability
 */

import vault from 'node-vault';
import type { VaultConfig, VaultSecret } from './types.js';

/**
 * Simplified Vault client with basic KV v2 support
 */
export class VaultClient {
    private vault: ReturnType<typeof vault>;
    private config: VaultConfig;
    private cache = new Map<string, { data: VaultSecret; expiresAt: number }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(config: VaultConfig) {
        this.config = config;
        
        // Create node-vault instance
        this.vault = vault({
            apiVersion: 'v1',
            endpoint: config.address,
            token: config.token,
            requestOptions: {
                timeout: config.timeout || 5000,
            },
        });
    }

    /**
     * Initialize and test Vault connection
     */
    async initialize(): Promise<void> {
        try {
            // Health check to verify connectivity
            const health = await this.vault.health();
            
            if (health.initialized && !health.sealed) {
                console.log('✅ Vault connection established');
            } else {
                throw new Error('Vault is sealed or not initialized');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Vault initialization failed: ${message}`);
        }
    }

    /**
     * Read secret from Vault KV v2 store
     * Automatically handles both KV v1 and v2 formats
     */
    async getSecret(path: string): Promise<VaultSecret> {
        // Check cache first
        const cached = this.getFromCache(path);
        if (cached) {
            return cached;
        }

        try {
            const response = await this.vault.read(path);
            
            // KV v2 format: data is nested under response.data.data
            // KV v1 format: data is directly under response.data
            const secretData = ('data' in response.data) ? response.data.data : response.data;
            
            if (!secretData || typeof secretData !== 'object') {
                throw new Error(`Invalid secret format at path: ${path}`);
            }

            const secret: VaultSecret = {
                data: secretData as Record<string, any>,
            };

            // Store in cache
            this.setCache(path, secret);

            return secret;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to read secret from ${path}: ${message}`);
        }
    }

    /**
     * Write secret to Vault KV v2 store
     */
    async setSecret(path: string, data: Record<string, any>): Promise<void> {
        try {
            await this.vault.write(path, { data });
            
            // Invalidate cache for this path
            this.cache.delete(path);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to write secret to ${path}: ${message}`);
        }
    }

    /**
     * Delete secret from Vault
     */
    async deleteSecret(path: string): Promise<void> {
        try {
            await this.vault.delete(path);
            
            // Remove from cache
            this.cache.delete(path);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete secret at ${path}: ${message}`);
        }
    }

    /**
     * List secrets at a path
     */
    async listSecrets(path: string): Promise<string[]> {
        try {
            const response = await this.vault.list(path);
            return response.data?.keys || [];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to list secrets at ${path}: ${message}`);
        }
    }

    /**
     * Get from cache if not expired
     */
    private getFromCache(path: string): VaultSecret | null {
        const cached = this.cache.get(path);
        
        if (!cached) {
            return null;
        }

        // Check if expired
        if (Date.now() > cached.expiresAt) {
            this.cache.delete(path);
            return null;
        }

        return cached.data;
    }

    /**
     * Store in cache with expiration
     */
    private setCache(path: string, secret: VaultSecret): void {
        this.cache.set(path, {
            data: secret,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
    }

    /**
     * Clear all cached secrets
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; paths: string[] } {
        return {
            size: this.cache.size,
            paths: Array.from(this.cache.keys()),
        };
    }
}

/**
 * Factory function to create VaultClient from environment variables
 */
export function createVaultClientFromEnv(): VaultClient {
    const config: VaultConfig = {
        address: process.env.VAULT_ADDR || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN || 'dev-root-token',
        timeout: parseInt(process.env.VAULT_TIMEOUT || '5000', 10),
    };

    return new VaultClient(config);
}
