import {
    FriendshipDomain,
    FriendshipStatus,
    type Friendship,
} from '../../../domain/entities/friendship.entity';
import type { FriendshipRepository } from '../../../domain/ports';

interface RespondFriendRequestInput {
    friendshipId: string;
    userId: string;
    status: FriendshipStatus.ACCEPTED | FriendshipStatus.REJECTED;
}

export class RespondFriendRequestUseCase {
    constructor(private readonly friendshipRepository: FriendshipRepository) {}

    async execute(input: RespondFriendRequestInput): Promise<Friendship> {
        const friendship = await this.friendshipRepository.findById(input.friendshipId);

        if (!friendship) {
            throw new Error('Friend request not found');
        }

        if (friendship.addresseeId !== input.userId) {
            throw new Error('Only the recipient can respond to this request');
        }

        let transitionType: 'ACCEPT' | 'REJECT';

        if (input.status === FriendshipStatus.ACCEPTED) {
            transitionType = 'ACCEPT';
        } else {
            transitionType = 'REJECT';
        }

        const updatedFriendship = FriendshipDomain.transition(friendship, { type: transitionType });

        await this.friendshipRepository.update(friendship.id, {
            status: updatedFriendship.status,
            respondedAt: updatedFriendship.respondedAt,
            blockedBy: updatedFriendship.blockedBy,
        });

        return {
            ...friendship,
            ...updatedFriendship,
        };
    }
}
