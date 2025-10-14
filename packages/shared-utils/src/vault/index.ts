/**
 * Vault Package Main Exports
 * 
 * Production-ready Vault integration for Transcendence microservices
 */

// Core client and types
export { VaultClient } from './client.js';
export {
    ServiceVaultHelper,
    createVaultHelper,
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
    VaultAuthResponse,
    VaultListResponse,
    VaultError,
    VaultMetrics,
    ServiceVaultConfig,
    EnvVaultConfig,
    IVaultClient,
    CacheEntry
} from './types.js';

// Re-export utility functions
import {
    createHealthyVaultClient,
    waitForVault,
    validateVaultConfig,
    buildVaultConfigFromEnv,
    createKVv2Path,
    parseSecretPath,
    retryWithBackoff,
    isRetryableError,
    maskSensitiveData,
    createSafeLogger
} from './utils';

export {
    createHealthyVaultClient,
    waitForVault,
    validateVaultConfig,
    buildVaultConfigFromEnv,
    createKVv2Path,
    parseSecretPath,
    retryWithBackoff,
    isRetryableError,
    maskSensitiveData,
    createSafeLogger
};