export type FriendshipStatusDTO = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface AddFriendRequestDTO {
    readonly friendId: string;
}

export interface SendFriendRequestInputDTO extends AddFriendRequestDTO {
    readonly requesterId: string;
}

export interface UpdateFriendRequestDTO {
    readonly status: FriendshipStatusDTO;
}

export interface RespondFriendRequestInputDTO {
    readonly friendshipId: string;
    readonly userId: string;
    readonly status: FriendshipStatusDTO;
}

export interface ListFriendsInputDTO {
    readonly userId: string;
    readonly statuses?: FriendshipStatusDTO[];
}

export interface BlockUserInputDTO {
    readonly userId: string;
    readonly otherUserId: string;
}

export interface RemoveFriendInputDTO {
    readonly userId: string;
    readonly friendId: string;
}

export interface UnblockUserInputDTO {
    readonly userId: string;
    readonly otherUserId: string;
}

export interface CancelFriendRequestInputDTO {
    readonly requesterId: string;
    readonly friendshipId: string;
}

export interface FriendshipDTO {
    readonly id: string;
    readonly userId: string;
    readonly friendId: string;
    readonly status: FriendshipStatusDTO;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface FriendDTO {
    readonly id: string;
    readonly username: string;
    readonly displayName?: string;
    readonly avatar?: string;
    readonly isOnline: boolean;
    readonly presenceStatus?: 'ONLINE' | 'OFFLINE' | 'INGAME';
    readonly lastSeenAt?: string;
    readonly friendshipStatus: FriendshipStatusDTO;
    readonly friendshipId: string;
    readonly isRequester: boolean;
}

export interface FriendListResponseDTO {
    readonly friends: FriendDTO[];
    readonly totalCount: number;
}
