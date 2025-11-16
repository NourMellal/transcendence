import type { User } from '../../../domain/entities/user.entity.js';
import { FriendshipStatus, type Friendship } from '../../../domain/entities/friendship.entity.js';
import type { FriendshipRepository, UserRepository } from '../../../domain/ports.js';

export interface FriendListItem {
    friendship: Friendship;
    friend: User | null;
}

interface ListFriendsOptions {
    statuses?: FriendshipStatus[];
}

export class ListFriendsUseCase {
    constructor(
        private readonly friendshipRepository: FriendshipRepository,
        private readonly userRepository: UserRepository
    ) {}

    async execute(userId: string, options: ListFriendsOptions = {}): Promise<FriendListItem[]> {
        const friendships = await this.friendshipRepository.listForUser(userId, options.statuses);

        const friendIds = friendships.map(friendship =>
            friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId
        );

        const uniqueFriendIds = Array.from(new Set(friendIds));

        const friendsMap = new Map<string, User>();
        await Promise.all(
            uniqueFriendIds.map(async id => {
                const user = await this.userRepository.findById(id);
                if (user) {
                    friendsMap.set(id, user);
                }
            })
        );

        return friendships.map(friendship => {
            const otherUserId = friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;
            return {
                friendship,
                friend: friendsMap.get(otherUserId) ?? null,
            };
        });
    }
}
