import type { FastifyReply, FastifyRequest } from 'fastify';
import {
    sendFriendRequestSchema,
    respondFriendRequestSchema,
    friendshipIdParamSchema,
    userIdParamSchema,
} from '@transcendence/shared-validation';
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

        let payload: AddFriendRequestDTO;
        try {
            payload = sendFriendRequestSchema.parse(request.body);
        } catch (error) {
            this.handleValidationError(error, reply);
            return;
        }

        try {
            const friendship = await this.sendFriendRequestUseCase.execute(requesterId, payload.friendId);
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

        let params: RespondParams;
        try {
            params = friendshipIdParamSchema.parse(request.params) as RespondParams;
        } catch (error) {
            this.handleValidationError(error, reply);
            return;
        }

        let body: UpdateFriendRequestDTO;
        try {
            body = respondFriendRequestSchema.parse(request.body) as UpdateFriendRequestDTO;
        } catch (error) {
            this.handleValidationError(error, reply);
            return;
        }

        const responseStatus =
            body.status === 'accepted'
                ? FriendshipStatus.ACCEPTED
                : FriendshipStatus.REJECTED;

        try {
            const friendship = await this.respondFriendRequestUseCase.execute({
                friendshipId: params.friendshipId,
                userId,
                status: responseStatus,
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

        let params: BlockParams;
        try {
            params = userIdParamSchema.parse(request.params) as BlockParams;
        } catch (error) {
            this.handleValidationError(error, reply);
            return;
        }

        try {
            const friendship = await this.blockUserUseCase.execute(userId, params.userId);
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

    private handleValidationError(error: unknown, reply: FastifyReply): void {
        if (typeof error === 'object' && error !== null && 'issues' in error) {
            const issues = (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
            reply.code(400).send({
                error: 'Bad Request',
                message: 'Validation failed',
                details: issues?.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            });
            return;
        }

        reply.code(400).send({
            error: 'Bad Request',
            message: (error as Error)?.message || 'Invalid request payload',
        });
    }
}
