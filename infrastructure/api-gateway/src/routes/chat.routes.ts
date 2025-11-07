/**
 * Chat Routes
 * Handles messaging and conversations (WebSocket)
 */

import type { FastifyInstance } from 'fastify';
import { sendMessageSchema } from '@transcendence/shared-validation';
import { validateRequestBody } from '../middleware/validation.middleware.js';
import { requireAuth, getUser } from '../middleware/auth.middleware.js';

export async function registerChatRoutes(
    fastify: FastifyInstance,
    chatServiceUrl: string,
    internalApiKey: string
) {
    /**
     * GET /api/chat/messages
     * Protected - Get message history
     */
    fastify.get('/api/chat/messages', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const queryString = new URL(request.url, `http://${request.headers.host}`).search;

        const response = await fetch(`${chatServiceUrl}/chat/messages${queryString}`, {
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
     * POST /api/chat/messages
     * Protected - Send message
     */
    fastify.post('/api/chat/messages', {
        preHandler: [
            requireAuth,
            validateRequestBody(sendMessageSchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${chatServiceUrl}/chat/messages`, {
            method: 'POST',
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
     * GET /api/chat/conversations
     * Protected - Get user's conversations
     */
    fastify.get('/api/chat/conversations', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${chatServiceUrl}/chat/conversations`, {
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

    // WebSocket route /api/chat/ws will be handled separately in server.ts

    fastify.log.info('✅ Chat routes registered');
}
