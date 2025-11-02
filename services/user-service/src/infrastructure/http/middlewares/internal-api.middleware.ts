/**
 * Internal API middleware
 * Validates that requests come from API Gateway with valid internal API key
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

/**
 * Middleware to validate internal API key
 * Ensures only API Gateway can call this service
 */
export async function validateInternalApiKey(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
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
