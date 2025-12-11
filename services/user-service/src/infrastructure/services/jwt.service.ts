/**
 * User Service JWT Service
 * 
 * Wraps Vault JWT functionality for user-service
 * Fetches JWT secrets from Vault with fallback to environment
 */

import { createUserServiceVault, type JWTConfig } from '@transcendence/shared-utils';

export class UserServiceJWTService {
    private vault = createUserServiceVault();
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
            this.jwtConfig.expirationHours = this.normalizeExpirationHours(this.jwtConfig.expirationHours);
            this.lastFetch = Date.now();
            this.initialized = true;
            console.log('✅ User Service JWT initialized with Vault secrets');
        } catch (error) {
            console.warn('⚠️ User Service JWT using environment fallback:', (error as Error).message);
            this.jwtConfig = {
                secretKey: process.env.JWT_SECRET || 'fallback-jwt-secret-for-development',
                issuer: process.env.JWT_ISSUER || 'transcendence',
                expirationHours: this.normalizeExpirationHours(undefined),
            };
            this.initialized = false;
        }
    }

    /**
     * Get JWT configuration with auto-refresh
     */
    async getJWTConfig(): Promise<JWTConfig> {
        // Refresh config if cache is stale
        const age = Date.now() - this.lastFetch;
        if (age > this.CACHE_TTL && this.initialized) {
            try {
                this.jwtConfig = await this.vault.getJWTConfig();
                this.jwtConfig.expirationHours = this.normalizeExpirationHours(this.jwtConfig.expirationHours);
                this.lastFetch = Date.now();
            } catch (error) {
                console.warn('Failed to refresh JWT config from Vault, using cached:', (error as Error).message);
            }
        }

        if (!this.jwtConfig) {
            await this.initialize();
        }

        return this.jwtConfig!;
    }

    /**
     * Check if service is using Vault
     */
    isUsingVault(): boolean {
        return this.initialized;
    }

    /**
     * Cleanup
     */
    async shutdown(): Promise<void> {
        await this.vault.shutdown();
        this.jwtConfig = null;
    }

    /**
     * Keep access tokens short-lived (default 15 minutes) even if Vault provides
     * a larger value. Uses the minimum of provided and fallback durations.
     */
    private normalizeExpirationHours(value: number | undefined): number {
        const fallback = parseFloat(process.env.JWT_EXPIRATION_HOURS || '0.25'); // 15 minutes
        if (typeof value === 'number' && !Number.isNaN(value)) {
            return Math.min(value, fallback);
        }
        return fallback;
    }
}

// Singleton instance
let jwtService: UserServiceJWTService | null = null;

/**
 * Get or create JWT Service singleton
 */
export function getJWTService(): UserServiceJWTService {
    if (!jwtService) {
        jwtService = new UserServiceJWTService();
    }
    return jwtService;
}

/**
 * Initialize JWT Service (call once at app startup)
 */
export async function initializeJWTService(): Promise<UserServiceJWTService> {
    const service = getJWTService();
    await service.initialize();
    return service;
}
