/**
 * Tournament Routes
 * Handles tournament management
 */

import type { FastifyInstance } from 'fastify';
import { createTournamentSchema, tournamentIdParamSchema, tournamentMatchParamSchema } from '@transcendence/shared-validation';
import { validateRequestBody, validateRequestParams } from '../middleware/validation.middleware';
import { requireAuth, getUser } from '../middleware/auth.middleware';

export async function registerTournamentRoutes(
    fastify: FastifyInstance,
    tournamentServiceUrl: string,
    internalApiKey: string
) {
    /**
     * GET /api/tournaments
     * Protected - List all tournaments
     */
    fastify.get('/api/tournaments', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const queryString = new URL(request.url, `http://${request.headers.host}`).search;

        const response = await fetch(`${tournamentServiceUrl}/tournaments${queryString}`, {
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
     * POST /api/tournaments
     * Protected - Create new tournament
     */
    fastify.post('/api/tournaments', {
        preHandler: [
            requireAuth,
            validateRequestBody(createTournamentSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${tournamentServiceUrl}/tournaments`, {
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
     * GET /api/tournaments/:tournamentId
     * Protected - Get tournament details
     */
    fastify.get('/api/tournaments/:tournamentId', {
        preHandler: [
            requireAuth,
            validateRequestParams(tournamentIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { tournamentId } = request.params as { tournamentId: string };

        const response = await fetch(`${tournamentServiceUrl}/tournaments/${tournamentId}`, {
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
     * POST /api/tournaments/:tournamentId/join
     * Protected - Join tournament
     */
    fastify.post('/api/tournaments/:tournamentId/join', {
        preHandler: [
            requireAuth,
            validateRequestParams(tournamentIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { tournamentId } = request.params as { tournamentId: string };
        const queryString = new URL(request.url, `http://${request.headers.host}`).search;

        const response = await fetch(`${tournamentServiceUrl}/tournaments/${tournamentId}/join${queryString}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
            body: JSON.stringify(request.body ?? {}),
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * POST /api/tournaments/:tournamentId/start
     * Protected - Start tournament (creator only)
     */
    fastify.post('/api/tournaments/:tournamentId/start', {
        preHandler: [
            requireAuth,
            validateRequestParams(tournamentIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { tournamentId } = request.params as { tournamentId: string };

        const response = await fetch(`${tournamentServiceUrl}/tournaments/${tournamentId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
            body: JSON.stringify(request.body ?? {}),
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * POST /api/tournaments/:tournamentId/matches/:matchId/play
     * Protected - Start a tournament match by creating a game
     */
    fastify.post('/api/tournaments/:tournamentId/matches/:matchId/play', {
        preHandler: [
            requireAuth,
            validateRequestParams(tournamentMatchParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { tournamentId, matchId } = request.params as { tournamentId: string; matchId: string };

        const response = await fetch(`${tournamentServiceUrl}/tournaments/${tournamentId}/matches/${matchId}/play`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
            body: JSON.stringify(request.body ?? {}),
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * POST /api/tournaments/:tournamentId/leave
     * Protected - Leave tournament
     */
    fastify.post('/api/tournaments/:tournamentId/leave', {
        preHandler: [
            requireAuth,
            validateRequestParams(tournamentIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { tournamentId } = request.params as { tournamentId: string };

        const response = await fetch(`${tournamentServiceUrl}/tournaments/${tournamentId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
            body: JSON.stringify(request.body ?? {}),
        });

        if (response.status === 204) {
            return reply.code(response.status).send();
        }

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * GET /api/tournaments/:tournamentId/bracket
     * Protected - Get tournament bracket
     */
    fastify.get('/api/tournaments/:tournamentId/bracket', {
        preHandler: [
            requireAuth,
            validateRequestParams(tournamentIdParamSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const { tournamentId } = request.params as { tournamentId: string };

        const response = await fetch(`${tournamentServiceUrl}/tournaments/${tournamentId}/bracket`, {
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
     * GET /api/tournaments/my-tournaments
     * Protected - Get current user's tournaments
     */
    fastify.get('/api/tournaments/my-tournaments', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const queryString = new URL(request.url, `http://${request.headers.host}`).search;
        const response = await fetch(`${tournamentServiceUrl}/tournaments/my-tournaments${queryString}`, {
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

    fastify.log.info('✅ Tournament routes registered');
}
