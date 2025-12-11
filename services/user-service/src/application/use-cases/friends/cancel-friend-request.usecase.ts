import { FriendshipRepository } from '../../../domain/ports';
import type { ICancelFriendRequestUseCase } from '../../../domain/ports';
import { FriendshipStatus } from '../../../domain/entities/friendship.entity';
import type { CancelFriendRequestInputDTO } from '../../dto/friend.dto';

export class CancelFriendRequestUseCase implements ICancelFriendRequestUseCase {
    constructor(private readonly friendshipRepository: FriendshipRepository) {}

    async execute(input: CancelFriendRequestInputDTO): Promise<void> {
        const { requesterId, friendshipId } = input;
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
