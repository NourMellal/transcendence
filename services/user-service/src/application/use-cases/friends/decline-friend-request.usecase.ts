import { FriendshipStatus } from '../../../domain/entities/user.entity.js';
import { 
    DeclineFriendRequestUseCase, 
    FriendshipRepository 
} from '../../../domain/ports.js';

export class DeclineFriendRequestUseCaseImpl implements DeclineFriendRequestUseCase {
    constructor(private friendshipRepository: FriendshipRepository) {}

    async execute(userId: string, friendshipId: string): Promise<void> {
        const friendship = await this.friendshipRepository.findById(friendshipId);
        
        if (!friendship) {
            throw new Error('Friend request not found');
        }

        // Verify that the user is the addressee of the request
        if (friendship.addresseeId !== userId) {
            throw new Error('You can only decline friend requests sent to you');
        }

        // Verify that the request is still pending
        if (friendship.status !== FriendshipStatus.PENDING) {
            throw new Error('Friend request is no longer pending');
        }

        // Update the friendship status to declined
        await this.friendshipRepository.update(friendshipId, {
            status: FriendshipStatus.DECLINED,
            updatedAt: new Date()
        });
    }
}