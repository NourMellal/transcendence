/**
 * Friends System Types and Models
 */

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  avatar?: string;
  status?: 'ONLINE' | 'OFFLINE' | 'AWAY';
  is2FAEnabled?: boolean;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED',
  DECLINED = 'DECLINED'
}

export interface FriendRequest {
  id: string;
  fromUser: User;
  toUser: User;
  message?: string;
  status: FriendshipStatus;
  createdAt: string;
}

export interface SendFriendRequestDTO {
  toUserId: string;
  message?: string;
}

export interface FriendshipActionDTO {
  friendshipId: string;
}

export interface FriendsState {
  friends: User[];
  pendingRequests: Friendship[];
  sentRequests: Friendship[];
  searchResults: User[];
  isLoading: boolean;
  error: string | null;
}

export interface FriendsActions {
  sendFriendRequest: (toUserId: string, message?: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  declineFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  loadFriends: () => Promise<void>;
  loadPendingRequests: () => Promise<void>;
  loadSentRequests: () => Promise<void>;
}