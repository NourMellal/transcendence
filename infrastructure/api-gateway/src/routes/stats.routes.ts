/**
 * Statistics & Leaderboard Routes
 * Handles user stats and global leaderboards
 */

import type { FastifyInstance } from 'fastify';
import { userIdParamSchema } from '@transcendence/shared-validation';
import { validateRequestParams } from '../middleware/validation.middleware';
import { requireAuth, getUser } from '../middleware/auth.middleware';

export async function registerStatsRoutes(
    fastify: FastifyInstance,
    userServiceUrl: string,
    internalApiKey: string
) {
    /**
     * GET /api/stats/me
     * Protected - Get current user's stats
     */
    fastify.get('/api/stats/me', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${userServiceUrl}/stats/me`, {
            method: 'GET',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * GET /api/stats/users/:userId
     * Protected - Get specific user's stats
     */
    fastify.get('/api/stats/users/:userId', {
        preHandler: [
            requireAuth,
            validateRequestParams(userIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { userId } = request.params as { userId: string };

        const response = await fetch(`${userServiceUrl}/stats/users/${userId}`, {
            method: 'GET',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * GET /api/leaderboard
     * Protected - Get global leaderboard
     */
    fastify.get('/api/leaderboard', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const queryString = new URL(request.url, `http://${request.headers.host}`).search;

        const response = await fetch(`${userServiceUrl}/leaderboard${queryString}`, {
            method: 'GET',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    fastify.log.info('✅ Stats routes registered');
}
