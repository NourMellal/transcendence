/**
 * Internal API middleware
 * Validates that requests come from API Gateway with valid internal API key
 * Fetches the key from Vault for enhanced security
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { VaultClient } from '@transcendence/shared-utils';

let cachedInternalApiKey: string | null = null;

/**
 * Initialize and cache the internal API key from Vault
 */
async function getInternalApiKey(): Promise<string | null> {
    if (cachedInternalApiKey) {
        return cachedInternalApiKey;
    }

    try {
        const vault = new VaultClient({
            address: process.env.VAULT_ADDR || 'http://localhost:8200',
            token: process.env.VAULT_TOKEN || 'dev-root-token',
        });

        await vault.initialize();
        const secrets = await vault.getSecret('secret/user-service');
        cachedInternalApiKey = secrets.data.INTERNAL_API_KEY || null;
        return cachedInternalApiKey;
    } catch (error) {
        console.error('[Vault] Failed to fetch INTERNAL_API_KEY:', error);
        // Fallback to environment variable
        return process.env.INTERNAL_API_KEY || null;
    }
}

/**
 * Middleware to validate internal API key
 * Ensures only API Gateway can call this service
 */
export async function validateInternalApiKey(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const INTERNAL_API_KEY = await getInternalApiKey();

    // In development mode, allow requests without key
    if (process.env.NODE_ENV === 'development' && !INTERNAL_API_KEY) {
        return;
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
