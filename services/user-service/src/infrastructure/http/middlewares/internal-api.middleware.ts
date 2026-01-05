/**
 * Internal API middleware
 * Validates that requests come from API Gateway with valid internal API key
 * Fetches the key from Vault once and caches it for the process lifetime
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createUserServiceVault } from '@transcendence/shared-utils';

let vaultHelper: ReturnType<typeof createUserServiceVault> | null = null;
let vaultInitialized = false;
let cachedInternalApiKey: string | null = null;
let fetchingInternalApiKey: Promise<string | null> | null = null;

async function loadInternalApiKey(): Promise<string | null> {
    if (cachedInternalApiKey) {
        return cachedInternalApiKey;
    }

    if (!fetchingInternalApiKey) {
        fetchingInternalApiKey = (async () => {
            let key: string | null = null;

            try {
                // Lazy initialization of vaultHelper
                if (!vaultHelper) {
                    vaultHelper = createUserServiceVault();
                }

                if (!vaultInitialized) {
                    await vaultHelper.initialize();
                    vaultInitialized = true;
                }

                key = await vaultHelper.getInternalApiKey();

                if (!key) {
                    throw new Error('INTERNAL_API_KEY not found in Vault. Run: pnpm vault:setup');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error('[Security] CRITICAL: Failed to load INTERNAL_API_KEY from Vault:', message);
                console.error('[Security] Service cannot start without INTERNAL_API_KEY. Run: pnpm vault:setup');
                throw error;
            }

            cachedInternalApiKey = key;
            return key;
        })().finally(() => {
            fetchingInternalApiKey = null;
        });
    }

    return fetchingInternalApiKey;
}

/**
 * Middleware to validate internal API key
 * Ensures only API Gateway can call this service
 */
export async function validateInternalApiKey(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const apiKey = request.headers['x-internal-api-key'] as string;

    // If no API key is provided, check if we should allow it in development
    if (!apiKey) {
        // In development mode, allow requests without API key (for direct testing)
        // But in production, always require the API key
        // if (process.env.NODE_ENV === 'development' && process.env.SKIP_INTERNAL_API_CHECK !== 'false') {
        //     request.log.debug('Skipping internal API key validation in development mode (no key provided).');
        //     return;
        // }

        // Production or explicit check required - reject
        return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Missing internal API key',
        });
    }

    // If API key is provided, always validate it (even in development)
    const INTERNAL_API_KEY = await loadInternalApiKey();

    if (!INTERNAL_API_KEY) {
        request.log.error('INTERNAL_API_KEY is not configured. Rejecting request.');
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal API key is not configured',
        });
    }

    if (apiKey !== INTERNAL_API_KEY) {
        request.log.warn({
            providedKeyLength: apiKey.length,
            expectedKeyLength: INTERNAL_API_KEY.length,
        }, 'Invalid internal API key provided');
        return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Invalid internal API key',
        });
    }

    // Valid API key - allow request
    request.log.debug('Internal API key validated successfully');
}
