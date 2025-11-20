import type { User } from '../../domain/entities/user.entity';
import type { Friendship } from '../../domain/entities/friendship.entity';
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

    static toFriendDTO(selfId: string, friendship: Friendship, friendUser: User | null): FriendDTO {
        const friendId = friendship.requesterId === selfId ? friendship.addresseeId : friendship.requesterId;
        return {
            id: friendUser ? friendUser.id.toString() : friendId,
            username: friendUser ? friendUser.username.toString() : 'unknown',
            displayName: friendUser ? friendUser.displayName.toString() : undefined,
            avatar: friendUser?.avatar,
            isOnline: false,
            friendshipStatus: friendship.status,
        };
    }

    static toFriendListResponse(
        selfId: string,
        friendships: Friendship[],
        friendsMap: Map<string, User | undefined | null>
    ): FriendListResponseDTO {
        const friends = friendships.map(friendship => {
            const otherUserId = friendship.requesterId === selfId ? friendship.addresseeId : friendship.requesterId;
            return this.toFriendDTO(selfId, friendship, friendsMap.get(otherUserId) ?? null);
        });

        return {
            friends,
            totalCount: friends.length,
        };
    }
}
