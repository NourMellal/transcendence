/**
 * User service
 * Handles all user-related API calls
 */

import { HttpClient } from './HttpClient';
import type { User, UpdateUserRequest } from '../../models/User';

export class UserService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Get current user's profile
   * GET /users/me
   */
  async getProfile(): Promise<User> {
    return this.httpClient.get<User>('/users/me');
  }

  /**
   * Update current user's profile
   * PATCH /users/me
   * 
   * Handles both JSON and FormData (for avatar uploads)
   */
  async updateProfile(updates: UpdateUserRequest): Promise<User> {
    // If avatar file is included, use FormData
    if (updates.avatar) {
      const formData = new FormData();
      
      if (updates.username) {
        formData.append('username', updates.username);
      }
      
      formData.append('avatar', updates.avatar);
      
      return this.httpClient.patchForm<User>('/users/me', formData);
    }
    
    // Otherwise, send JSON
    return this.httpClient.patch<User>('/users/me', updates);
  }
}
