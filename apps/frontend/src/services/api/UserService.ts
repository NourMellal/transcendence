import { HttpClient } from './HttpClient.js';

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  avatarUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserSearchParams {
  query: string;
  page?: number;
  limit?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isOnline?: boolean;
  lastSeen?: string;
  stats?: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    eloRating: number;
  };
}

export interface UserSearchResult {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export class UserService {
  private http: HttpClient;

  constructor(baseURL: string = '/api') {
    this.http = new HttpClient(baseURL);
  }

  // user profile methods
  async getCurrentUser(): Promise<UserProfile> {
    try {
      return await this.http.get<UserProfile>('/users/me');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserById(userId: string): Promise<UserProfile> {
    try {
      return await this.http.get<UserProfile>(`/users/${userId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserByUsername(username: string): Promise<UserProfile> {
    try {
      return await this.http.get<UserProfile>(`/users/username/${username}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(updates: UpdateProfileRequest): Promise<UserProfile> {
    try {
      return await this.http.put<UserProfile>('/users/me', updates);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.http.put<ApiResponse<{ message: string }>>('/users/me/password', passwordData);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadAvatar(imageFile: File): Promise<{ avatarUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', imageFile);
  const client = this.http as HttpClient & { uploadFormData: <T>(e: string, f: FormData, m?: 'POST'|'PUT') => Promise<T> };
  return await client.uploadFormData<{ avatarUrl: string }>(`/users/me/avatar`, formData);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteAccount(confirmPassword: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.http.delete<ApiResponse<{ message: string }>>('/users/me', {
        body: JSON.stringify({ password: confirmPassword }),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // user search
  async searchUsers(params: UserSearchParams): Promise<UserSearchResult> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', params.query);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      return await this.http.get<UserSearchResult>(`/users/search?${queryParams}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRecommendedUsers(limit: number = 10): Promise<UserProfile[]> {
    try {
      return await this.http.get<UserProfile[]>(`/users/recommended?limit=${limit}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getOnlineUsers(): Promise<UserProfile[]> {
    try {
      return await this.http.get<UserProfile[]>('/users/online');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // friends system
  async getFriends(userId?: string): Promise<UserProfile[]> {
    try {
      const endpoint = userId ? `/users/${userId}/friends` : '/users/me/friends';
      return await this.http.get<UserProfile[]>(endpoint);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async sendFriendRequest(targetUserId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.http.post<ApiResponse<{ message: string }>>('/users/me/friends/requests', {
        targetUserId,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async acceptFriendRequest(requestId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.http.put<ApiResponse<{ message: string }>>(`/users/me/friends/requests/${requestId}/accept`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async rejectFriendRequest(requestId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.http.put<ApiResponse<{ message: string }>>(`/users/me/friends/requests/${requestId}/reject`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeFriend(friendId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.http.delete<ApiResponse<{ message: string }>>(`/users/me/friends/${friendId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // block system
  async blockUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.http.post<ApiResponse<{ message: string }>>('/users/me/blocked', {
        userId,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async unblockUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.http.delete<ApiResponse<{ message: string }>>(`/users/me/blocked/${userId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBlockedUsers(): Promise<UserProfile[]> {
    try {
      return await this.http.get<UserProfile[]>('/users/me/blocked');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // status and presence
  async updateStatus(status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    try {
      await this.http.put('/users/me/status', { status });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async setActive(): Promise<void> {
    try {
      await this.http.post('/users/me/active', {});
    } catch (error) {
      console.debug('Activity ping failed:', error);
    }
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      const anyErr = error as any;
      const message = anyErr?.body?.message || anyErr.message || 'Request failed';
      const e = new Error(message);
      (e as any).status = anyErr.status;
      (e as any).body = anyErr.body;
      return e;
    }
    return new Error('An unexpected error occurred');
  }
}