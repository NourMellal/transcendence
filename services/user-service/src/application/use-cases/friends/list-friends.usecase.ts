import type { User } from '../../../domain/entities/user.entity';
import { FriendshipStatus } from '../../../domain/entities/friendship.entity';
import type { PresenceStatus } from '../../../domain/entities/presence.entity';
import type { UserPresenceRepository, FriendshipRepository, UserRepository } from '../../../domain/ports';
import type { IListFriendsUseCase } from '../../../domain/ports';
import type { FriendListResponseDTO, ListFriendsInputDTO } from '../../dto/friend.dto';
import { FriendMapper } from '../../mappers/friend.mapper';

export class ListFriendsUseCase implements IListFriendsUseCase {
    constructor(
        private readonly friendshipRepository: FriendshipRepository,
        private readonly userRepository: UserRepository,
        private readonly presenceRepository: UserPresenceRepository
    ) {}

    async execute(input: ListFriendsInputDTO): Promise<FriendListResponseDTO> {
        const { userId, statuses } = input;
        const normalizedStatuses = statuses?.map((status) => this.toDomainStatus(status));
        const friendships = await this.friendshipRepository.listForUser(userId, normalizedStatuses);

        const friendIds = friendships.map(friendship =>
            friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId
        );

        const uniqueFriendIds = Array.from(new Set(friendIds));

        const friendsMap = new Map<string, User>();
        const presenceMap = new Map<string, PresenceStatus>();
        await Promise.all(
            uniqueFriendIds.map(async id => {
                const user = await this.userRepository.findById(id);
                if (user) {
                    friendsMap.set(id, user);
                }
                const presence = await this.presenceRepository.findByUserId(id);
                if (presence) {
                    presenceMap.set(id, presence.status);
                }
            })
        );

        return FriendMapper.toFriendListResponse(userId, friendships, friendsMap, presenceMap);
    }

    private toDomainStatus(status: string): FriendshipStatus {
        switch (status) {
            case 'accepted':
                return FriendshipStatus.ACCEPTED;
            case 'rejected':
                return FriendshipStatus.REJECTED;
            case 'blocked':
                return FriendshipStatus.BLOCKED;
            default:
                return FriendshipStatus.PENDING;
        }
    }
}
