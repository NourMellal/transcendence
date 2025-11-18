import { FriendshipRepository } from '../../../domain/ports';
import { FriendshipStatus } from '../../../domain/entities/friendship.entity';

export class CancelFriendRequestUseCase {
    constructor(private readonly friendshipRepository: FriendshipRepository) {}

    async execute(requesterId: string, friendshipId: string): Promise<void> {
        if (!requesterId) {
            throw new Error('Requester ID is required');
        }
        if (!friendshipId) {
            throw new Error('Friendship ID is required');
        }

        const friendship = await this.friendshipRepository.findById(friendshipId);

        if (!friendship) {
            throw new Error('Friend request not found');
        }

        if (friendship.status !== FriendshipStatus.PENDING) {
            throw new Error('Only pending requests can be cancelled');
        }

        if (friendship.requesterId !== requesterId) {
            throw new Error('Only the requester can cancel this friend request');
        }

        await this.friendshipRepository.delete(friendship.id);
    }
}
