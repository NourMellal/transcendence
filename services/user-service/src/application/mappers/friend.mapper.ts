import type { User } from '../../domain/entities/user.entity';
import type { Friendship } from '../../domain/entities/friendship.entity';
import { PresenceStatus } from '../../domain/entities/presence.entity';
import type { FriendDTO, FriendListResponseDTO, FriendshipDTO } from '../dto/friend.dto';

export class FriendMapper {
    static toFriendshipDTO(friendship: Friendship): FriendshipDTO {
        return {
            id: friendship.id,
            userId: friendship.requesterId,
            friendId: friendship.addresseeId,
            status: friendship.status,
            createdAt: friendship.createdAt.toISOString(),
            updatedAt: friendship.updatedAt.toISOString(),
        };
    }

    static toFriendDTO(
        selfId: string,
        friendship: Friendship,
        friendUser: User | null,
        presenceStatus?: PresenceStatus
    ): FriendDTO {
        const friendId = friendship.requesterId === selfId ? friendship.addresseeId : friendship.requesterId;
        const isRequester = friendship.requesterId === selfId;
        return {
            id: friendUser ? friendUser.id.toString() : friendId,
            username: friendUser ? friendUser.username.toString() : 'unknown',
            displayName: friendUser ? friendUser.displayName.toString() : undefined,
            avatar: friendUser?.avatar,
            isOnline: presenceStatus === PresenceStatus.ONLINE,
            friendshipStatus: friendship.status,
            friendshipId: friendship.id,
            isRequester,
        };
    }

    static toFriendListResponse(
        selfId: string,
        friendships: Friendship[],
        friendsMap: Map<string, User | undefined | null>,
        presenceMap: Map<string, PresenceStatus | undefined>
    ): FriendListResponseDTO {
        const friends = friendships.map(friendship => {
            const otherUserId = friendship.requesterId === selfId ? friendship.addresseeId : friendship.requesterId;
            return this.toFriendDTO(
                selfId,
                friendship,
                friendsMap.get(otherUserId) ?? null,
                presenceMap.get(otherUserId)
            );
        });

        return {
            friends,
            totalCount: friends.length,
        };
    }
}
