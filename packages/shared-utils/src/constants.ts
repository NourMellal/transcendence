/**
 * Shared constants across services
 * Centralizes magic numbers and configuration values
 */

// Time constants
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Security constants
export const REFRESH_TOKEN_BYTES = 48;
export const DEFAULT_JWT_CACHE_TTL_MS = 300000; // 5 minutes

// Limits
export const MAX_USERNAME_GENERATION_ATTEMPTS = 1000;
