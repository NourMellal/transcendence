import { FriendshipDomain, FriendshipStatus } from '../../../domain/entities/friendship.entity';
import type { FriendshipRepository, UserRepository } from '../../../domain/ports';
import type { ISendFriendRequestUseCase } from '../../../domain/ports';
import type { FriendshipDTO, SendFriendRequestInputDTO } from '../../dto/friend.dto';
import { FriendMapper } from '../../mappers/friend.mapper';

export class SendFriendRequestUseCase implements ISendFriendRequestUseCase {
    constructor(
        private readonly friendshipRepository: FriendshipRepository,
        private readonly userRepository: UserRepository
    ) {}

    async execute(input: SendFriendRequestInputDTO): Promise<FriendshipDTO> {
        const { requesterId, friendId } = input;
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

        return FriendMapper.toFriendshipDTO(friendship);
    }
}
