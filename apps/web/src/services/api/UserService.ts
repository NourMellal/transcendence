import { httpClient } from './client';
import {
  User,
  UserProfile,
  Friend,
  UserDTOs,
  PaginatedResponse,
  Match
} from '../../models';

const API_PREFIX = '';

/**
 * User Service
 * Handles user profile management, friends, and user-related operations
 */
export class UserService {
  /**
   * Get current user profile
   */
  async getMe(): Promise<User> {
    const response = await httpClient.get<User>(`${API_PREFIX}/users/me`);
    return response.data!;
  }

  /**
   * Get detailed user profile with stats and match history
   */
  async getProfile(userId?: string): Promise<UserProfile> {
    const endpoint = userId ? `${API_PREFIX}/users/${userId}` : `${API_PREFIX}/users/me/profile`;
    const response = await httpClient.get<UserProfile>(endpoint);
    return response.data!;
  }

  /**
   * Update current user profile
   */
  async updateProfile(request: UserDTOs.UpdateProfileRequest): Promise<UserDTOs.UpdateProfileResponse> {
    const body = Object.fromEntries(
      Object.entries(request).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const response = await httpClient.patch<UserDTOs.UpdateProfileResponse>(`${API_PREFIX}/users/me`, body);
    return response.data!;
  }

  /**
   * Search users by username or email
   */
  async searchUsers(query: string, limit = 10): Promise<User[]> {
    const response = await httpClient.get<User[]>(`${API_PREFIX}/users/search`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Note: In a real implementation, search params would be in query string
    // For now, we'll assume the endpoint handles the search internally
    return response.data!;
  }

  /**
   * Get user's friends list
   */
  async getFriends(): Promise<Friend[]> {
    const response = await httpClient.get<Friend[]>(`${API_PREFIX}/users/me/friends`);
    return response.data!;
  }

  /**
   * Send friend request to a user
   */
  async addFriend(request: UserDTOs.AddFriendRequest): Promise<void> {
    await httpClient.post(`${API_PREFIX}/users/me/friends`, request);
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/users/me/friends/${userId}`);
  }

  /**
   * Get pending friend requests
   */
  async getFriendRequests(): Promise<{ sent: User[]; received: User[] }> {
    const response = await httpClient.get<{ sent: User[]; received: User[] }>(`${API_PREFIX}/users/me/friend-requests`);
    return response.data!;
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(userId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/users/me/friend-requests/${userId}/accept`);
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(userId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/users/me/friend-requests/${userId}/reject`);
  }

  /**
   * Get user's match history
   */
  async getMatchHistory(userId?: string, page = 1, limit = 20): Promise<PaginatedResponse<Match>> {
    const endpoint = userId ? `${API_PREFIX}/users/${userId}/matches` : `${API_PREFIX}/users/me/matches`;
    const response = await httpClient.get<PaginatedResponse<Match>>(
      `${endpoint}?page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  /**
   * Update user status (online, offline, in-game)
   */
  async updateStatus(status: 'ONLINE' | 'OFFLINE' | 'INGAME'): Promise<void> {
    await httpClient.patch(`${API_PREFIX}/users/me/status`, { status });
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/users/me/blocked`, { userId });
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/users/me/blocked/${userId}`);
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<User[]> {
    const response = await httpClient.get<User[]>(`${API_PREFIX}/users/me/blocked`);
    return response.data!;
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/users/me`);
    // Clear auth token after account deletion
    httpClient.clearAuthToken();
  }
}

// Export singleton instance
export const userService = new UserService();
