import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validateInternalApiKey } from '../middlewares/internal-api.middleware.js';
import { FriendController } from '../controllers/friend.controller.js';
import type {
    AddFriendRequestDTO,
    UpdateFriendRequestDTO,
} from '../../../application/dto/friend.dto.js';

export function registerFriendRoutes(
    fastify: FastifyInstance,
    friendController: FriendController
) {
    fastify.post<{ Body: AddFriendRequestDTO }>('/friends/requests', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: AddFriendRequestDTO }>, reply: FastifyReply) => {
        return friendController.sendRequest(request, reply);
    });

    fastify.patch<{ Params: { friendshipId: string }; Body: UpdateFriendRequestDTO }>(
        '/friends/requests/:friendshipId', {
            preHandler: [validateInternalApiKey]
        }, async (
            request: FastifyRequest<{ Params: { friendshipId: string }; Body: UpdateFriendRequestDTO }>,
            reply: FastifyReply
        ) => {
            return friendController.respondRequest(request, reply);
        }
    );

    fastify.delete<{ Params: { friendshipId: string } }>(
        '/friends/requests/:friendshipId', {
            preHandler: [validateInternalApiKey]
        }, async (
            request: FastifyRequest<{ Params: { friendshipId: string } }>,
            reply: FastifyReply
        ) => {
            return friendController.cancelRequest(request, reply);
        }
    );

    fastify.get('/friends', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        return friendController.listFriends(request, reply);
    });

    fastify.post<{ Params: { userId: string } }>('/friends/:userId/block', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        return friendController.blockUser(request, reply);
    });

    fastify.delete<{ Params: { userId: string } }>('/friends/:userId/block', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        return friendController.unblockUser(request, reply);
    });

    fastify.delete<{ Params: { userId: string } }>('/friends/:userId', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        return friendController.removeFriend(request, reply);
    });

    fastify.log.info('✅ Friend routes registered');
}
