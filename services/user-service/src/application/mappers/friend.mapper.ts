import type { User } from '../../domain/entities/user.entity.js';
import type { Friendship } from '../../domain/entities/friendship.entity.js';
import type { FriendDTO, FriendListResponseDTO, FriendshipDTO } from '../dto/friend.dto.js';
import type { FriendListItem } from '../use-cases/list-friends.usecase.js';

export class FriendMapper {
    static toFriendshipDTO(friendship: Friendship): FriendshipDTO {
        return {
            id: friendship.id,
            userId: friendship.requesterId,
            friendId: friendship.addresseeId,
            status: friendship.status,
            createdAt: friendship.createdAt,
            updatedAt: friendship.updatedAt,
        };
    }

    static toFriendDTO(selfId: string, friendship: Friendship, friendUser: User | null): FriendDTO {
        const friendId = friendship.requesterId === selfId ? friendship.addresseeId : friendship.requesterId;
        return {
            id: friendUser?.id ?? friendId,
            username: friendUser?.username ?? 'unknown',
            displayName: friendUser?.displayName,
            avatar: friendUser?.avatar,
            isOnline: false,
            friendshipStatus: friendship.status,
        };
    }

    static toFriendListResponse(selfId: string, items: FriendListItem[]): FriendListResponseDTO {
        return {
            friends: items.map(item => this.toFriendDTO(selfId, item.friendship, item.friend)),
            totalCount: items.length,
        };
    }
}
