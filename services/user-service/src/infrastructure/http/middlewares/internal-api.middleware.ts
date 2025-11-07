/**
 * Internal API middleware
 * Validates that requests come from API Gateway with valid internal API key
 * Fetches the key from Vault once and caches it for the process lifetime
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createUserServiceVault } from '@transcendence/shared-utils';

const vaultHelper = createUserServiceVault();
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
                if (!vaultInitialized) {
                    await vaultHelper.initialize();
                    vaultInitialized = true;
                }

                const config = await vaultHelper.getServiceConfig();
                key = (config.internal_api_key ?? config.internalApiKey ?? process.env.INTERNAL_API_KEY ?? null) as string | null;

                if (!key) {
                    console.warn('[Security] INTERNAL_API_KEY missing in Vault configuration and environment.');
                }
            } catch (error) {
                console.warn('[Security] Failed to load INTERNAL_API_KEY from Vault:', error);
                key = process.env.INTERNAL_API_KEY || null;
            }

            if (!key && process.env.NODE_ENV === 'development') {
                console.warn('[Security] Allowing requests without INTERNAL_API_KEY in development mode.');
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
    const INTERNAL_API_KEY = await loadInternalApiKey();

    // In development mode, allow requests without key
    if (process.env.NODE_ENV === 'development' && !INTERNAL_API_KEY) {
        request.log.debug('Skipping internal API key validation in development mode.');
        return;
    }

    if (!INTERNAL_API_KEY) {
        request.log.error('INTERNAL_API_KEY is not configured. Rejecting request.');
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal API key is not configured',
        });
    }

    const apiKey = request.headers['x-internal-api-key'] as string;

    if (!apiKey || apiKey !== INTERNAL_API_KEY) {
        return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Invalid or missing internal API key',
        });
    }
}
