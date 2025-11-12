import type { FastifyReply, FastifyRequest } from 'fastify';
import { SendFriendRequestUseCase } from '../../../application/use-cases/send-friend-request.usecase.js';
import { RespondFriendRequestUseCase } from '../../../application/use-cases/respond-friend-request.usecase.js';
import { ListFriendsUseCase } from '../../../application/use-cases/list-friends.usecase.js';
import { BlockUserUseCase } from '../../../application/use-cases/block-user.usecase.js';
import type { AddFriendRequestDTO, UpdateFriendRequestDTO } from '../../../application/dto/friend.dto.js';
import { FriendshipStatus } from '../../../domain/entities/friendship.entity.js';
import { FriendMapper } from '../../../application/mappers/friend.mapper.js';

interface RespondParams {
    friendshipId: string;
}

interface BlockParams {
    userId: string;
}

export class FriendController {
    constructor(
        private readonly sendFriendRequestUseCase: SendFriendRequestUseCase,
        private readonly respondFriendRequestUseCase: RespondFriendRequestUseCase,
        private readonly listFriendsUseCase: ListFriendsUseCase,
        private readonly blockUserUseCase: BlockUserUseCase
    ) {}

    async sendRequest(
        request: FastifyRequest<{ Body: AddFriendRequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        const requesterId = request.headers['x-user-id'] as string;

        if (!requesterId) {
            reply.code(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
            return;
        }

        try {
            const friendship = await this.sendFriendRequestUseCase.execute(requesterId, request.body.friendId);
            reply.code(201).send(FriendMapper.toFriendshipDTO(friendship));
        } catch (error: any) {
            request.log.error({ err: error }, 'Send friend request failed');
            const message = error.message || 'Failed to send friend request';

            if (message.includes('not found') || message.includes('yourself')) {
                reply.code(400).send({ error: 'Bad Request', message });
                return;
            }

            if (message.includes('pending') || message.includes('already friends') || message.includes('blocked')) {
                reply.code(409).send({ error: 'Conflict', message });
                return;
            }

            reply.code(500).send({
                error: 'Internal Server Error',
                message,
            });
        }
    }

    async respondRequest(
        request: FastifyRequest<{ Params: RespondParams; Body: UpdateFriendRequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        const userId = request.headers['x-user-id'] as string;

        if (!userId) {
            reply.code(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
            return;
        }

        const { friendshipId } = request.params;

        const status = request.body?.status;

        if (!status) {
            reply.code(400).send({ error: 'Bad Request', message: 'Invalid status for respond' });
            return;
        }

        if (![FriendshipStatus.ACCEPTED, FriendshipStatus.REJECTED].includes(status)) {
            reply.code(400).send({ error: 'Bad Request', message: 'Invalid status for respond' });
            return;
        }

        try {
            const friendship = await this.respondFriendRequestUseCase.execute({
                friendshipId,
                userId,
                status,
            });

            reply.code(200).send(FriendMapper.toFriendshipDTO(friendship));
        } catch (error: any) {
            request.log.error({ err: error }, 'Respond friend request failed');
            const message = error.message || 'Failed to respond to friend request';

            if (message.includes('not found')) {
                reply.code(404).send({ error: 'Not Found', message });
                return;
            }

            if (message.includes('Only the recipient')) {
                reply.code(403).send({ error: 'Forbidden', message });
                return;
            }

            if (message.includes('Invalid friendship status')) {
                reply.code(400).send({ error: 'Bad Request', message });
                return;
            }

            reply.code(500).send({ error: 'Internal Server Error', message });
        }
    }

    async listFriends(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const userId = request.headers['x-user-id'] as string;

        if (!userId) {
            reply.code(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
            return;
        }

        try {
            const friends = await this.listFriendsUseCase.execute(userId);
            reply.code(200).send(FriendMapper.toFriendListResponse(userId, friends));
        } catch (error: any) {
            request.log.error({ err: error }, 'List friends failed');
            reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to list friends' });
        }
    }

    async blockUser(
        request: FastifyRequest<{ Params: BlockParams }>,
        reply: FastifyReply
    ): Promise<void> {
        const userId = request.headers['x-user-id'] as string;

        if (!userId) {
            reply.code(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
            return;
        }

        try {
            const friendship = await this.blockUserUseCase.execute(userId, request.params.userId);
            reply.code(200).send(FriendMapper.toFriendshipDTO(friendship));
        } catch (error: any) {
            request.log.error({ err: error }, 'Block user failed');
            const message = error.message || 'Failed to block user';

            if (message.includes('yourself')) {
                reply.code(400).send({ error: 'Bad Request', message });
                return;
            }

            if (message.includes('not found')) {
                reply.code(404).send({ error: 'Not Found', message });
                return;
            }

            reply.code(500).send({ error: 'Internal Server Error', message });
        }
    }
}
