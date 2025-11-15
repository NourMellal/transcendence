import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validateInternalApiKey } from '../middlewares/internal-api.middleware.js';
import { PresenceController } from '../controllers/presence.controller.js';
import { PresenceStatus } from '../../../domain/entities/presence.entity.js';

export function registerPresenceRoutes(
    fastify: FastifyInstance,
    presenceController: PresenceController
) {
    fastify.post<{ Body: { status: PresenceStatus } }>('/users/presence', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: { status: PresenceStatus } }>, reply: FastifyReply) => {
        return presenceController.updatePresence(request, reply);
    });

    fastify.get<{ Params: { userId: string } }>('/users/:userId/presence', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        return presenceController.getPresence(request, reply);
    });

    fastify.log.info('✅ Presence routes registered');
}
