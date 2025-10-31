/**
 * Game Routes
 * Handles game creation, joining, and real-time gameplay (WebSocket)
 */

import type { FastifyInstance} from 'fastify';
import { createGameSchema, gameIdParamSchema } from '@transcendence/shared-validation';
import { validateRequestBody, validateRequestParams } from '../middleware/validation.middleware.js';
import { requireAuth, getUser } from '../middleware/auth.middleware.js';

export async function registerGameRoutes(
    fastify: FastifyInstance,
    gameServiceUrl: string,
    internalApiKey: string
) {
    /**
     * GET /api/games
     * Protected - List all games
     */
    fastify.get('/api/games', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const queryString = new URL(request.url, `http://${request.headers.host}`).search;

        const response = await fetch(`${gameServiceUrl}/games${queryString}`, {
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
     * POST /api/games
     * Protected - Create new game
     */
    fastify.post('/api/games', {
        preHandler: [
            requireAuth,
            validateRequestBody(createGameSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${gameServiceUrl}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
            body: JSON.stringify(request.body),
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * GET /api/games/:gameId
     * Protected - Get game details
     */
    fastify.get('/api/games/:gameId', {
        preHandler: [
            requireAuth,
            validateRequestParams(gameIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { gameId } = request.params as { gameId: string };

        const response = await fetch(`${gameServiceUrl}/games/${gameId}`, {
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
     * DELETE /api/games/:gameId
     * Protected - Delete game
     */
    fastify.delete('/api/games/:gameId', {
        preHandler: [
            requireAuth,
            validateRequestParams(gameIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { gameId } = request.params as { gameId: string };

        const response = await fetch(`${gameServiceUrl}/games/${gameId}`, {
            method: 'DELETE',
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
     * POST /api/games/:gameId/join
     * Protected - Join game
     */
    fastify.post('/api/games/:gameId/join', {
        preHandler: [
            requireAuth,
            validateRequestParams(gameIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { gameId } = request.params as { gameId: string };

        const response = await fetch(`${gameServiceUrl}/games/${gameId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
     * POST /api/games/:gameId/leave
     * Protected - Leave game
     */
    fastify.post('/api/games/:gameId/leave', {
        preHandler: [
            requireAuth,
            validateRequestParams(gameIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { gameId } = request.params as { gameId: string };

        const response = await fetch(`${gameServiceUrl}/games/${gameId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
     * GET /api/games/my-games
     * Protected - Get current user's games
     */
    fastify.get('/api/games/my-games', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${gameServiceUrl}/games/my-games`, {
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

    // WebSocket route /api/games/ws will be handled separately in server.ts

    fastify.log.info('✅ Game routes registered');
}
