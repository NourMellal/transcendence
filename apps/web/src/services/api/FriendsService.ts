import { HttpClient } from '../api/HttpClient';
import type { 
  User, 
  Friendship
} from '../../models/Friends';

export class FriendsService {
  private httpClient: HttpClient;

  constructor(httpClient?: HttpClient) {
    this.httpClient = httpClient || new HttpClient('/api');
  }

  /**
   * Send a friend request to another user
   */
  async sendFriendRequest(toUserId: string, message?: string): Promise<Friendship> {
    const response = await this.httpClient.post<Friendship>('/friends/requests', {
      toUserId,
      message
    });
    
    if (!response.data) {
      throw new Error('Failed to send friend request');
    }
    
    return response.data;
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(friendshipId: string): Promise<void> {
    await this.httpClient.post<void>('/friends/requests/accept', {
      friendshipId
    });
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(friendshipId: string): Promise<void> {
    await this.httpClient.post<void>('/friends/requests/decline', {
      friendshipId
    });
  }

  /**
   * Remove an existing friend
   */
  async removeFriend(friendId: string): Promise<void> {
    await this.httpClient.delete<void>(`/friends/${friendId}`);
  }

  /**
   * Get list of current friends
   */
  async getFriends(): Promise<User[]> {
    const response = await this.httpClient.get<User[]>('/friends');
    return response.data || [];
  }

  /**
   * Get pending friend requests (received)
   */
  async getPendingRequests(): Promise<Friendship[]> {
    const response = await this.httpClient.get<Friendship[]>('/friends/requests/pending');
    return response.data || [];
  }

  /**
   * Get sent friend requests
   */
  async getSentRequests(): Promise<Friendship[]> {
    const response = await this.httpClient.get<Friendship[]>('/friends/requests/sent');
    return response.data || [];
  }

  /**
   * Search for users to add as friends
   */
  async searchUsers(query: string): Promise<User[]> {
    const response = await this.httpClient.get<User[]>(`/users/search?query=${encodeURIComponent(query)}`);
    return response.data || [];
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<User> {
    const response = await this.httpClient.get<User>(`/users/${userId}`);
    
    if (!response.data) {
      throw new Error('User not found');
    }
    
    return response.data;
  }
}

// Export singleton instance
export const friendsService = new FriendsService();