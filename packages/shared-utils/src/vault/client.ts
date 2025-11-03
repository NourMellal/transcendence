/**
 * Fixed critical security issues while keeping it simple
 */

import vault from 'node-vault';
import type { VaultConfig, VaultSecret } from './types.js';

export class VaultClient {
    private vault: ReturnType<typeof vault>;
    private config: VaultConfig;
    private cache = new Map<string, { data: VaultSecret; expiresAt: number }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private cleanupInterval?: NodeJS.Timeout;

    constructor(config: VaultConfig) {
        this.config = config;

        this.vault = vault({
            apiVersion: 'v1',
            endpoint: config.address,
            token: config.token,
            requestOptions: {
                timeout: config.timeout || 5000,
            },
        });

        // Auto-cleanup expired cache
        this.startCacheCleanup();
    }

    async initialize(): Promise<void> {
        try {
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

    async getSecret(path: string): Promise<VaultSecret> {
        const cached = this.getFromCache(path);
        if (cached) {
            return cached;
        }

        try {
            const response = await this.vault.read(path);

            // Proper KV v1/v2 detection
            let secretData: Record<string, any>;

            if (response.data?.data && response.data?.metadata) {
                // KV v2: has nested data + metadata
                secretData = response.data.data;
            } else if (response.data) {
                // KV v1: data directly
                secretData = response.data;
            } else {
                throw new Error(`No data found at path: ${path}`);
            }

            if (!secretData || typeof secretData !== 'object') {
                throw new Error(`Invalid secret format at path: ${path}`);
            }

            const secret: VaultSecret = {
                data: secretData,
            };

            this.setCache(path, secret);
            return secret;

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to read secret from ${path}: ${message}`);
        }
    }

    async setSecret(path: string, data: Record<string, any>): Promise<void> {
        try {
            await this.vault.write(path, { data });
            this.cache.delete(path);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to write secret to ${path}: ${message}`);
        }
    }

    async deleteSecret(path: string): Promise<void> {
        try {
            await this.vault.delete(path);
            this.cache.delete(path);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete secret at ${path}: ${message}`);
        }
    }

    async listSecrets(path: string): Promise<string[]> {
        try {
            const response = await this.vault.list(path);
            return response.data?.keys || [];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to list secrets at ${path}: ${message}`);
        }
    }

    private getFromCache(path: string): VaultSecret | null {
        const cached = this.cache.get(path);

        if (!cached || Date.now() > cached.expiresAt) {
            this.cache.delete(path);
            return null;
        }

        return cached.data;
    }

    private setCache(path: string, secret: VaultSecret): void {
        this.cache.set(path, {
            data: secret,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
    }

    private startCacheCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [path, cached] of this.cache.entries()) {
                if (now > cached.expiresAt) {
                    this.cache.delete(path);
                }
            }
        }, this.CACHE_TTL_MS);

        // Don't block process exit
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    clearCache(): void {
        this.cache.clear();
    }

    getCacheStats(): { size: number } {
        return { size: this.cache.size };
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clearCache();
    }
}

import * as dotenv from 'dotenv';
dotenv.config();

export function createVaultClientFromEnv(): VaultClient {
    // Only use dev token in development
    const token = process.env.VAULT_TOKEN ||
        (process.env.NODE_ENV === 'development' ? 'dev-root-token' : undefined);

    if (!token) {
        throw new Error('❌ VAULT_TOKEN environment variable is required');
    }

    const config: VaultConfig = {
        address: process.env.VAULT_ADDR || 'http://localhost:8200',
        token,
        timeout: parseInt(process.env.VAULT_TIMEOUT || '5000', 10),
    };

    return new VaultClient(config);
}
