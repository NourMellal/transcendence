import { FastifyRequest, FastifyReply } from 'fastify';
import { 
    SendFriendRequestUseCase,
    AcceptFriendRequestUseCase,
    DeclineFriendRequestUseCase,
    RemoveFriendUseCase,
    GetFriendsListUseCase,
    GetPendingFriendRequestsUseCase,
    GetSentFriendRequestsUseCase,
    SearchUsersUseCase
} from '../../../domain/ports.js';

// Request/Response DTOs
interface SendFriendRequestDTO {
    toUserId: string;
    message?: string;
}

interface FriendshipActionDTO {
    friendshipId: string;
}

interface SearchUsersDTO {
    query: string;
}

export class FriendsController {
    constructor(
        private sendFriendRequestUseCase: SendFriendRequestUseCase,
        private acceptFriendRequestUseCase: AcceptFriendRequestUseCase,
        private declineFriendRequestUseCase: DeclineFriendRequestUseCase,
        private removeFriendUseCase: RemoveFriendUseCase,
        private getFriendsListUseCase: GetFriendsListUseCase,
        private getPendingFriendRequestsUseCase: GetPendingFriendRequestsUseCase,
        private getSentFriendRequestsUseCase: GetSentFriendRequestsUseCase,
        private searchUsersUseCase: SearchUsersUseCase
    ) {}

    async sendFriendRequest(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = this.extractUserIdFromRequest(request);
            const { toUserId, message } = request.body as SendFriendRequestDTO;

            if (!toUserId) {
                return reply.status(400).send({ error: 'toUserId is required' });
            }

            const friendship = await this.sendFriendRequestUseCase.execute(userId, toUserId, message);
            return reply.status(201).send(friendship);
        } catch (error: any) {
            return this.handleError(error, reply);
        }
    }

    async acceptFriendRequest(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = this.extractUserIdFromRequest(request);
            const { friendshipId } = request.body as FriendshipActionDTO;

            if (!friendshipId) {
                return reply.status(400).send({ error: 'friendshipId is required' });
            }

            await this.acceptFriendRequestUseCase.execute(userId, friendshipId);
            return reply.status(200).send({ message: 'Friend request accepted' });
        } catch (error: any) {
            return this.handleError(error, reply);
        }
    }

    async declineFriendRequest(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = this.extractUserIdFromRequest(request);
            const { friendshipId } = request.body as FriendshipActionDTO;

            if (!friendshipId) {
                return reply.status(400).send({ error: 'friendshipId is required' });
            }

            await this.declineFriendRequestUseCase.execute(userId, friendshipId);
            return reply.status(200).send({ message: 'Friend request declined' });
        } catch (error: any) {
            return this.handleError(error, reply);
        }
    }

    async removeFriend(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = this.extractUserIdFromRequest(request);
            const { friendId } = request.params as { friendId: string };

            if (!friendId) {
                return reply.status(400).send({ error: 'friendId is required' });
            }

            await this.removeFriendUseCase.execute(userId, friendId);
            return reply.status(200).send({ message: 'Friend removed' });
        } catch (error: any) {
            return this.handleError(error, reply);
        }
    }

    async getFriends(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = this.extractUserIdFromRequest(request);
            const friends = await this.getFriendsListUseCase.execute(userId);
            return reply.status(200).send(friends);
        } catch (error: any) {
            return this.handleError(error, reply);
        }
    }

    async getPendingRequests(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = this.extractUserIdFromRequest(request);
            const requests = await this.getPendingFriendRequestsUseCase.execute(userId);
            return reply.status(200).send(requests);
        } catch (error: any) {
            return this.handleError(error, reply);
        }
    }

    async getSentRequests(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = this.extractUserIdFromRequest(request);
            const requests = await this.getSentFriendRequestsUseCase.execute(userId);
            return reply.status(200).send(requests);
        } catch (error: any) {
            return this.handleError(error, reply);
        }
    }

    async searchUsers(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = this.extractUserIdFromRequest(request);
            const { query } = request.query as SearchUsersDTO;

            if (!query) {
                return reply.status(400).send({ error: 'query parameter is required' });
            }

            const users = await this.searchUsersUseCase.execute(query, userId);
            return reply.status(200).send(users);
        } catch (error: any) {
            return this.handleError(error, reply);
        }
    }

    private extractUserIdFromRequest(request: FastifyRequest): string {
        // Extract user ID from the x-user-id header set by the API Gateway
        const userId = request.headers['x-user-id'] as string;
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return userId;
    }

    private handleError(error: any, reply: FastifyReply) {
        console.error('Friends API Error:', error);

        // Handle specific error types
        if (error.message.includes('not found')) {
            return reply.status(404).send({ error: error.message });
        }

        if (error.message.includes('already') || error.message.includes('Cannot')) {
            return reply.status(400).send({ error: error.message });
        }

        if (error.message.includes('not authenticated')) {
            return reply.status(401).send({ error: error.message });
        }

        if (error.message.includes('can only')) {
            return reply.status(403).send({ error: error.message });
        }

        // Default to 500 for unexpected errors
        return reply.status(500).send({ error: 'Internal server error' });
    }
}