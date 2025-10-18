/**
 * Vault Package Main Exports
 * 
 * Production-ready Vault integration for Transcendence microservices.
 * - Vault connection and authentication
 * - Secret fetching (JWT, OAuth 42, database configs)
 * - Environment variable fallback
 * - Simple caching mechanism
 */

// Core client and types
export { VaultClient } from './client.js';
export {
    ServiceVaultHelper,
    createUserServiceVault,
    createGameServiceVault,
    createChatServiceVault,
    createTournamentServiceVault,
    createAPIGatewayVault
} from './service-helper.js';

// Type definitions
export type {
    VaultConfig,
    VaultSecret,
    ServiceVaultConfig,
    DatabaseConfig,
    JWTConfig,
    APIConfig
} from './types.js';