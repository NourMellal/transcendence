import {
    FriendshipDomain,
    FriendshipStatus,
} from '../../../domain/entities/friendship.entity';
import type { FriendshipRepository, UserRepository } from '../../../domain/ports';
import type { IBlockUserUseCase } from '../../../domain/ports';
import type { BlockUserInputDTO, FriendshipDTO } from '../../dto/friend.dto';
import { FriendMapper } from '../../mappers/friend.mapper';

export class BlockUserUseCase implements IBlockUserUseCase {
    constructor(
        private readonly friendshipRepository: FriendshipRepository,
        private readonly userRepository: UserRepository
    ) {}

    async execute(input: BlockUserInputDTO): Promise<FriendshipDTO> {
        const { userId: blockingUserId, otherUserId } = input;
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
            return FriendMapper.toFriendshipDTO(friendship);
        }

        if (existing.status === FriendshipStatus.BLOCKED && existing.blockedBy === blockingUserId) {
            return FriendMapper.toFriendshipDTO(existing);
        }

        const updatedFriendship = FriendshipDomain.transition(existing, {
            type: 'BLOCK',
            blockedBy: blockingUserId,
        });

        await this.friendshipRepository.update(existing.id, {
            status: updatedFriendship.status,
            blockedBy: updatedFriendship.blockedBy,
        });

        return FriendMapper.toFriendshipDTO({
            ...existing,
            ...updatedFriendship,
        });
    }
}
