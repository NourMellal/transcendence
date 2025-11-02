/**
 * Friends System DTOs
 * Data Transfer Objects for friend-related operations
 */

export enum FriendshipStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    BLOCKED = 'blocked'
}

// Request DTOs
export interface AddFriendRequestDTO {
    friendId: string;
}

export interface UpdateFriendRequestDTO {
    status: FriendshipStatus;
}

// Response DTOs
export interface FriendshipDTO {
    id: string;
    userId: string;
    friendId: string;
    status: FriendshipStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface FriendDTO {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    isOnline: boolean;
    friendshipStatus: FriendshipStatus;
}

export interface FriendListResponseDTO {
    friends: FriendDTO[];
    totalCount: number;
}
