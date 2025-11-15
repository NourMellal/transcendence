import { FriendshipRepository } from '../../domain/ports.js';
import { FriendshipStatus } from '../../domain/entities/friendship.entity.js';

export class RemoveFriendUseCase {
    constructor(private readonly friendshipRepository: FriendshipRepository) {}

    async execute(userId: string, friendId: string): Promise<void> {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!friendId) {
            throw new Error('Friend ID is required');
        }
        const friendship = await this.friendshipRepository.findBetweenUsers(userId, friendId);

        if (!friendship) {
            throw new Error('Friendship not found');
        }

        if (friendship.status !== FriendshipStatus.ACCEPTED) {
            throw new Error('Only accepted friendships can be removed');
        }

        if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
            throw new Error('Unauthorized to remove this friendship');
        }

        await this.friendshipRepository.delete(friendship.id);
    }
}
