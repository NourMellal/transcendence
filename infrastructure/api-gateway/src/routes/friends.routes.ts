import type { FastifyInstance } from 'fastify';
import { requireAuth, getUser } from '../middleware/auth.middleware.js';
import {
    validateRequestBody,
    validateRequestParams,
    validateContentType,
} from '../middleware/validation.middleware.js';
import {
    sendFriendRequestSchema,
    respondFriendRequestSchema,
    friendshipIdParamSchema,
    userIdParamSchema,
} from '@transcendence/shared-validation';

export async function registerFriendRoutes(
    fastify: FastifyInstance,
    userServiceUrl: string,
    internalApiKey: string
) {
    fastify.get('/api/friends', {
        preHandler: [requireAuth],
    }, async (request, reply) => {
        const user = getUser(request);

        const response = await fetch(`${userServiceUrl}/friends`, {
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

    fastify.post('/api/friends/requests', {
        preHandler: [
            requireAuth,
            validateContentType(['application/json']),
            validateRequestBody(sendFriendRequestSchema),
        ],
    }, async (request, reply) => {
        const user = getUser(request);

        const response = await fetch(`${userServiceUrl}/friends/requests`, {
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

    fastify.patch('/api/friends/requests/:friendshipId', {
        preHandler: [
            requireAuth,
            validateContentType(['application/json']),
            validateRequestParams(friendshipIdParamSchema),
            validateRequestBody(respondFriendRequestSchema),
        ],
    }, async (request, reply) => {
        const user = getUser(request);
        const { friendshipId } = request.params as { friendshipId: string };

        const response = await fetch(`${userServiceUrl}/friends/requests/${friendshipId}`, {
            method: 'PATCH',
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

    fastify.delete('/api/friends/requests/:friendshipId', {
        preHandler: [
            requireAuth,
            validateRequestParams(friendshipIdParamSchema),
        ],
    }, async (request, reply) => {
        const user = getUser(request);
        const { friendshipId } = request.params as { friendshipId: string };

        const response = await fetch(`${userServiceUrl}/friends/requests/${friendshipId}`, {
            method: 'DELETE',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        if (response.status === 204) {
            return reply.code(204).send();
        }

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    fastify.post('/api/friends/:userId/block', {
        preHandler: [
            requireAuth,
            validateRequestParams(userIdParamSchema),
        ],
    }, async (request, reply) => {
        const user = getUser(request);
        const { userId } = request.params as { userId: string };

        const response = await fetch(`${userServiceUrl}/friends/${userId}/block`, {
            method: 'POST',
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

    fastify.delete('/api/friends/:userId/block', {
        preHandler: [
            requireAuth,
            validateRequestParams(userIdParamSchema),
        ],
    }, async (request, reply) => {
        const user = getUser(request);
        const { userId } = request.params as { userId: string };

        const response = await fetch(`${userServiceUrl}/friends/${userId}/block`, {
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

    fastify.delete('/api/friends/:userId', {
        preHandler: [
            requireAuth,
            validateRequestParams(userIdParamSchema),
        ],
    }, async (request, reply) => {
        const user = getUser(request);
        const { userId } = request.params as { userId: string };

        const response = await fetch(`${userServiceUrl}/friends/${userId}`, {
            method: 'DELETE',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        if (response.status === 204) {
            return reply.code(204).send();
        }

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    fastify.log.info('✅ Friend routes registered (gateway)');
}
