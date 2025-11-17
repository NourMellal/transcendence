import {
    FriendshipDomain,
    FriendshipStatus,
    type Friendship,
} from '../../../domain/entities/friendship.entity';
import type { FriendshipRepository, UserRepository } from '../../../domain/ports';

export class BlockUserUseCase {
    constructor(
        private readonly friendshipRepository: FriendshipRepository,
        private readonly userRepository: UserRepository
    ) {}

    async execute(blockingUserId: string, otherUserId: string): Promise<Friendship> {
        if (blockingUserId === otherUserId) {
            throw new Error('Cannot block yourself');
        }

        const otherUser = await this.userRepository.findById(otherUserId);
        if (!otherUser) {
            throw new Error('User not found');
        }

        const existing = await this.friendshipRepository.findBetweenUsers(blockingUserId, otherUserId);

        if (!existing) {
            const friendship = FriendshipDomain.createBlocked(blockingUserId, otherUserId, blockingUserId);
            await this.friendshipRepository.save(friendship);
            return friendship;
        }

        if (existing.status === FriendshipStatus.BLOCKED && existing.blockedBy === blockingUserId) {
            return existing;
        }

        const updatedFriendship = FriendshipDomain.transition(existing, {
            type: 'BLOCK',
            blockedBy: blockingUserId,
        });

        await this.friendshipRepository.update(existing.id, {
            status: updatedFriendship.status,
            blockedBy: updatedFriendship.blockedBy,
        });

        return {
            ...existing,
            ...updatedFriendship,
        };
    }
}
