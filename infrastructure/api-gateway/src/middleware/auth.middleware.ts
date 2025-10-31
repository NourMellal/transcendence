/**
 * Authentication Middleware
 *
 * Provides JWT authentication using Vault-based secret management
 * Validates tokens and attaches user context to requests
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getVaultJWTService, type JWTPayload } from '../utils/vault-jwt.service.js';

// Type augmentation is automatically loaded from ../types/fastify.d.ts

// Helper to get JWT payload from request
export function getUser(request: FastifyRequest): JWTPayload | undefined {
    return request.jwtPayload;
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
        return null;
    }

    // Check for "Bearer <token>" format
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

/**
 * Required authentication middleware
 * Rejects requests without valid JWT token
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = extractToken(request);

    if (!token) {
        return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Authorization header is missing or invalid. Format: Bearer <token>',
            timestamp: new Date().toISOString(),
        });
    }

    try {
        // Verify token using Vault JWT Service
        const jwtService = getVaultJWTService();
        const payload = await jwtService.verifyToken(token);

        // Attach user to request
        request.jwtPayload = payload;

        request.log.debug({
            userId: payload.userId || payload.sub,
            email: payload.email,
        }, 'User authenticated');
    } catch (error) {
        const err = error as Error;

        if (err.message === 'Token expired') {
            return reply.code(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Authorization token has expired',
                timestamp: new Date().toISOString(),
            });
        }

        if (err.message === 'Invalid token') {
            return reply.code(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Authorization token is invalid',
                timestamp: new Date().toISOString(),
            });
        }

        request.log.error({ err }, 'Token verification failed');

        return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Token verification failed',
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Optional authentication middleware
 * Does not reject requests without token, but validates if present
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = extractToken(request);

    // No token provided - continue without user context
    if (!token) {
        request.log.debug('No token provided for optional auth endpoint');
        return;
    }

    try {
        // Verify token using Vault JWT Service
        const jwtService = getVaultJWTService();
        const payload = await jwtService.verifyToken(token);

        // Attach user to request
        request.jwtPayload = payload;

        request.log.debug({
            userId: payload.userId || payload.sub,
            email: payload.email,
        }, 'Optional auth: User authenticated');
    } catch (error) {
        // Token invalid - log but don't fail the request
        request.log.debug({ error }, 'Optional auth: Invalid token provided, continuing without auth');
    }
}

/**
 * Public endpoint marker (no authentication required)
 * Useful for documentation/consistency
 */
export async function publicEndpoint(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // No-op middleware for public endpoints
    // Useful for explicit marking and future enhancements
    return;
}
