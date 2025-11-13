import crypto from 'crypto';
import { Friendship, FriendshipStatus } from '../../../domain/entities/user.entity.js';
import { 
    SendFriendRequestUseCase, 
    FriendshipRepository, 
    UserRepository 
} from '../../../domain/ports.js';

export class SendFriendRequestUseCaseImpl implements SendFriendRequestUseCase {
    constructor(
        private friendshipRepository: FriendshipRepository,
        private userRepository: UserRepository
    ) {}

    async execute(fromUserId: string, toUserId: string, message?: string): Promise<Friendship> {
        // Validate users exist
        const fromUser = await this.userRepository.findById(fromUserId);
        if (!fromUser) {
            throw new Error('Sender user not found');
        }

        const toUser = await this.userRepository.findById(toUserId);
        if (!toUser) {
            throw new Error('Recipient user not found');
        }

        // Check if users are the same
        if (fromUserId === toUserId) {
            throw new Error('Cannot send friend request to yourself');
        }

        // Check if friendship already exists
        const existingFriendship = await this.friendshipRepository.findByUsers(fromUserId, toUserId);
        if (existingFriendship) {
            switch (existingFriendship.status) {
                case FriendshipStatus.ACCEPTED:
                    throw new Error('Already friends with this user');
                case FriendshipStatus.PENDING:
                    throw new Error('Friend request already sent');
                case FriendshipStatus.BLOCKED:
                    throw new Error('Cannot send friend request to this user');
                case FriendshipStatus.DECLINED:
                    // Allow resending after declined
                    break;
            }
        }

        // Create new friendship request
        const friendship: Friendship = {
            id: crypto.randomUUID(),
            requesterId: fromUserId,
            addresseeId: toUserId,
            status: FriendshipStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // If there was a declined request, update it instead of creating new
        if (existingFriendship && existingFriendship.status === FriendshipStatus.DECLINED) {
            await this.friendshipRepository.update(existingFriendship.id, {
                status: FriendshipStatus.PENDING,
                updatedAt: new Date()
            });
            return { ...existingFriendship, status: FriendshipStatus.PENDING, updatedAt: new Date() };
        }

        await this.friendshipRepository.save(friendship);
        return friendship;
    }
}