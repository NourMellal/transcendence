import { FriendshipRepository } from '../../../domain/ports';
import type { IRemoveFriendUseCase } from '../../../domain/ports';
import { FriendshipStatus } from '../../../domain/entities/friendship.entity';
import type { RemoveFriendInputDTO } from '../../dto/friend.dto';

export class RemoveFriendUseCase implements IRemoveFriendUseCase {
    constructor(private readonly friendshipRepository: FriendshipRepository) {}

    async execute(input: RemoveFriendInputDTO): Promise<void> {
        const { userId, friendId } = input;
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
