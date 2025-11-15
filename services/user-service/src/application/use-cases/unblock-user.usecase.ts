import { FriendshipDomain, FriendshipStatus } from '../../domain/entities/friendship.entity.js';
import type { FriendshipRepository } from '../../domain/ports.js';

export class UnblockUserUseCase {
    constructor(private readonly friendshipRepository: FriendshipRepository) {}

    async execute(unblockingUserId: string, otherUserId: string) {
        if (unblockingUserId === otherUserId) {
            throw new Error('Cannot unblock yourself');
        }

        const friendship = await this.friendshipRepository.findBetweenUsers(unblockingUserId, otherUserId);

        if (!friendship || friendship.status !== FriendshipStatus.BLOCKED) {
            throw new Error('Blocked friendship not found');
        }

        if (friendship.blockedBy !== unblockingUserId) {
            throw new Error('Only the blocker can unblock this friendship');
        }

        const updated = FriendshipDomain.transition(friendship, { type: 'UNBLOCK' });

        await this.friendshipRepository.update(friendship.id, {
            status: updated.status,
            blockedBy: updated.blockedBy,
        });

        return {
            ...friendship,
            ...updated,
        };
    }
}
