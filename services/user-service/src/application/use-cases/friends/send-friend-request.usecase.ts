import { FriendshipDomain, FriendshipStatus, type Friendship } from '../../../domain/entities/friendship.entity';
import type { FriendshipRepository, UserRepository } from '../../../domain/ports';

export class SendFriendRequestUseCase {
    constructor(
        private readonly friendshipRepository: FriendshipRepository,
        private readonly userRepository: UserRepository
    ) {}

    async execute(requesterId: string, friendId: string): Promise<Friendship> {
        if (!requesterId) {
            throw new Error('Requester ID is required');
        }
        if (!friendId) {
            throw new Error('Friend ID is required');
        }
        if (requesterId === friendId) {
            throw new Error('Cannot send friend request to yourself');
        }

        const friend = await this.userRepository.findById(friendId);
        if (!friend) {
            throw new Error('User not found');
        }

        const existing = await this.friendshipRepository.findBetweenUsers(requesterId, friendId);
        if (existing) {
            if (existing.status === FriendshipStatus.PENDING) {
                throw new Error('Friend request already pending');
            }
            if (existing.status === FriendshipStatus.ACCEPTED) {
                throw new Error('Users are already friends');
            }
            if (existing.status === FriendshipStatus.BLOCKED) {
                throw new Error('Friendship is blocked');
            }

            // If previously rejected, allow resending by deleting the old record
            await this.friendshipRepository.delete(existing.id);
        }

        const friendship = FriendshipDomain.createRequest(requesterId, friendId);
        await this.friendshipRepository.save(friendship);

        return friendship;
    }
}
