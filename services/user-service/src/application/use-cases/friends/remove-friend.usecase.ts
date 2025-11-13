import { FriendshipStatus } from '../../../domain/entities/user.entity.js';
import { 
    RemoveFriendUseCase, 
    FriendshipRepository 
} from '../../../domain/ports.js';

export class RemoveFriendUseCaseImpl implements RemoveFriendUseCase {
    constructor(private friendshipRepository: FriendshipRepository) {}

    async execute(userId: string, friendId: string): Promise<void> {
        // Find the friendship between the two users
        const friendship = await this.friendshipRepository.findByUsers(userId, friendId);
        
        if (!friendship) {
            throw new Error('No friendship found between these users');
        }

        // Verify that the friendship is currently accepted
        if (friendship.status !== FriendshipStatus.ACCEPTED) {
            throw new Error('Users are not currently friends');
        }

        // Verify that the user is part of this friendship
        if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
            throw new Error('You are not part of this friendship');
        }

        // Remove the friendship completely
        await this.friendshipRepository.delete(friendship.id);
    }
}