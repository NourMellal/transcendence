/**
 * Vault-based JWT Service
 *
 * Fetches JWT secret from Vault dynamically with caching and fallback
 * Provides secure token verification using secrets from Vault
 */

import jwt from 'jsonwebtoken';
import { createAPIGatewayVault } from '@transcendence/shared-utils';
import type { JWTConfig } from '@transcendence/shared-utils';

export interface JWTPayload {
    userId?: string;
    sub?: string;
    email?: string;
    username?: string;
    iat?: number;
    exp?: number;
    iss?: string;
}

export class VaultJWTService {
    private vault = createAPIGatewayVault();
    private jwtConfig: JWTConfig | null = null;
    private lastFetch: number = 0;
    private readonly CACHE_TTL = 300000; // 5 minutes
    private initialized = false;

    /**
     * Initialize Vault connection and fetch JWT config
     */
    async initialize(): Promise<void> {
        try {
            await this.vault.initialize();
            this.jwtConfig = await this.vault.getJWTConfig();
            this.lastFetch = Date.now();
            this.initialized = true;
            console.log('✅ Vault JWT Service initialized with Vault secrets');
        } catch (error) {
            console.warn('⚠️ Vault JWT Service using environment fallback:', (error as Error).message);
            this.jwtConfig = {
                secretKey: process.env.JWT_SECRET || 'fallback-jwt-secret-for-development',
                issuer: process.env.JWT_ISSUER || 'transcendence',
                expirationHours: parseFloat(process.env.JWT_EXPIRATION_HOURS || '0.25'),
            };
            this.initialized = false;
        }
    }

    /**
     * Get JWT secret with caching and auto-refresh
     */
    async getJWTSecret(): Promise<string> {
        // Refresh config if cache is stale
        const age = Date.now() - this.lastFetch;
        if (age > this.CACHE_TTL && this.initialized) {
            try {
                this.jwtConfig = await this.vault.getJWTConfig();
                this.lastFetch = Date.now();
            } catch (error) {
                console.warn('Failed to refresh JWT config from Vault, using cached:', (error as Error).message);
            }
        }

        if (!this.jwtConfig) {
            throw new Error('JWT Service not initialized');
        }

        return this.jwtConfig.secretKey;
    }

    /**
     * Get JWT configuration
     */
    async getJWTConfig(): Promise<JWTConfig> {
        if (!this.jwtConfig) {
            await this.initialize();
        }

        return this.jwtConfig!;
    }

    /**
     * Verify JWT token using Vault secret
     */
    async verifyToken(token: string): Promise<JWTPayload> {
        const secret = await this.getJWTSecret();
        const config = await this.getJWTConfig();

        try {
            // Use native jwt.verify from jsonwebtoken (fastify-jwt uses this under the hood)
            const decoded = jwt.verify(token, secret, {
                issuer: config.issuer,
            }) as JWTPayload;

            return decoded;
        } catch (error) {
            const err = error as Error;
            if (err.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            } else if (err.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            } else {
                throw new Error(`Token verification failed: ${err.message}`);
            }
        }
    }

    /**
     * Check if service is using Vault
     */
    isUsingVault(): boolean {
        return this.initialized;
    }

    /**
     * Clear cached config (for testing)
     */
    clearCache(): void {
        this.jwtConfig = null;
        this.lastFetch = 0;
    }
}

// Singleton instance
let vaultJWTService: VaultJWTService | null = null;

/**
 * Get or create Vault JWT Service singleton
 */
export function getVaultJWTService(): VaultJWTService {
    if (!vaultJWTService) {
        vaultJWTService = new VaultJWTService();
    }
    return vaultJWTService;
}

/**
 * Initialize Vault JWT Service (call once at app startup)
 */
export async function initializeVaultJWTService(): Promise<VaultJWTService> {
    const service = getVaultJWTService();
    await service.initialize();
    return service;
}
