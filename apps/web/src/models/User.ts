import { Match } from './Game';

/**
 * Frontend User model - represents user data from API responses
 * This is separate from backend domain entities
 */
export interface User {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  avatar?: string;
  isTwoFAEnabled: boolean;
  status?: 'ONLINE' | 'OFFLINE' | 'INGAME';
  oauthProvider?: '42' | 'local' | null; // OAuth provider used for authentication
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * User profile with additional statistics
 */
export interface UserProfile extends User {
  stats: UserStats;
  matchHistory: Match[];
  friends: Friend[];
}

/**
 * User statistics
 */
export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  averageScore: number;
  tournaments: {
    participated: number;
    won: number;
  };
}

/**
 * Friend relationship
 */
export interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  status: 'ONLINE' | 'OFFLINE' | 'INGAME';
  isOnline: boolean;
  presenceStatus?: 'ONLINE' | 'OFFLINE' | 'INGAME';
  lastSeenAt?: string;
  friendshipStatus: 'pending' | 'accepted' | 'rejected' | 'blocked';
  friendshipId: string;
  isRequester: boolean;
  addedAt: string; // ISO date string
}

/**
 * Request/Response DTOs for user-related API calls
 */
export namespace UserDTOs {
  export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
  }

  export interface RegisterResponse {
    user: User;
    token: string;
  }

  export interface LoginRequest {
    email: string;
    password: string;
    twoFACode?: string;
  }

  export interface LoginResponse {
    user: User;
    token: string;
  }

  export interface UpdateProfileRequest {
    username?: string;
    displayName?: string;
    email?: string;
    avatar?: string;
  }

  export interface UpdateProfileResponse {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    is2FAEnabled: boolean;
    oauthProvider?: 'local' | '42';
    updatedAt: string;
    message: string;
  }

  export interface Generate2FAResponse {
    secret: string;
    qrCode: string; // Base64 encoded QR code image
  }

  export interface Enable2FARequest {
    secret: string;
    code: string;
  }

  export interface AddFriendRequest {
    userId: string;
  }
}
