import {
    FriendshipDomain,
    FriendshipStatus,
} from '../../../domain/entities/friendship.entity';
import type { FriendshipRepository } from '../../../domain/ports';
import type { IRespondFriendRequestUseCase } from '../../../domain/ports';
import type { FriendshipDTO, RespondFriendRequestInputDTO } from '../../dto/friend.dto';
import { FriendMapper } from '../../mappers/friend.mapper';

export class RespondFriendRequestUseCase implements IRespondFriendRequestUseCase {
    constructor(private readonly friendshipRepository: FriendshipRepository) {}

    async execute(input: RespondFriendRequestInputDTO): Promise<FriendshipDTO> {
        const friendship = await this.friendshipRepository.findById(input.friendshipId);

        if (!friendship) {
            throw new Error('Friend request not found');
        }

        if (friendship.addresseeId !== input.userId) {
            throw new Error('Only the recipient can respond to this request');
        }

        const transitionType: 'ACCEPT' | 'REJECT' =
            input.status === FriendshipStatus.ACCEPTED ? 'ACCEPT' : 'REJECT';

        const updatedFriendship = FriendshipDomain.transition(friendship, { type: transitionType });

        await this.friendshipRepository.update(friendship.id, {
            status: updatedFriendship.status,
            respondedAt: updatedFriendship.respondedAt,
            blockedBy: updatedFriendship.blockedBy,
        });

        return FriendMapper.toFriendshipDTO({
            ...friendship,
            ...updatedFriendship,
        });
    }
}
