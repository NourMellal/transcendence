import { FriendshipDomain, FriendshipStatus } from '../../../domain/entities/friendship.entity';
import type { FriendshipRepository } from '../../../domain/ports';
import type { IUnblockUserUseCase } from '../../../domain/ports';
import type { FriendshipDTO, UnblockUserInputDTO } from '../../dto/friend.dto';
import { FriendMapper } from '../../mappers/friend.mapper';

export class UnblockUserUseCase implements IUnblockUserUseCase {
    constructor(private readonly friendshipRepository: FriendshipRepository) {}

    async execute(input: UnblockUserInputDTO): Promise<FriendshipDTO> {
        const { userId: unblockingUserId, otherUserId } = input;
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

        return FriendMapper.toFriendshipDTO({
            ...friendship,
            ...updated,
        });
    }
}
