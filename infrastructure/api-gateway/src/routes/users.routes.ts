/**
 * User Routes
 * Handles user profile management
 */

import type { FastifyInstance } from 'fastify';
import { updateUserSchema } from '@transcendence/shared-validation';
import { validateRequestBody } from '../middleware/validation.middleware';
import { requireAuth, getUser } from '../middleware/auth.middleware';

export async function registerUserRoutes(
    fastify: FastifyInstance,
    userServiceUrl: string,
    internalApiKey: string
) {
    /**
     * GET /api/users/me
     * Protected - Get current user profile
     */
    fastify.get('/api/users/me', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${userServiceUrl}/users/me`, {
            method: 'GET',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'x-user-email': user?.email || '',
                'x-username': user?.username || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * PATCH /api/users/me
     * Protected - Update current user profile
     */
    fastify.patch('/api/users/me', {
        preHandler: [
            requireAuth,
            validateRequestBody(updateUserSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${userServiceUrl}/users/me`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'x-user-email': user?.email || '',
                'x-username': user?.username || '',
                'Authorization': request.headers.authorization || '',
            },
            body: JSON.stringify(request.body),
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * POST /api/users/presence
     * Protected - Update current user presence
     */
    fastify.post<{ Body: { status: string } }>('/api/users/presence', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${userServiceUrl}/users/presence`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
            },
            body: JSON.stringify(request.body),
        });

        if (response.status === 204) {
            return reply.code(204).send();
        }

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * GET /api/users/:userId/presence
     * Protected - Get presence for a user
     */
    fastify.get<{ Params: { userId: string } }>('/api/users/:userId/presence', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const response = await fetch(`${userServiceUrl}/users/${request.params.userId}/presence`, {
            method: 'GET',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
            },
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    fastify.log.info('✅ User routes registered');
}
