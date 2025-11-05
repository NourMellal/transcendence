import { User, UpdateUserRequest } from '../types/user';
import { mockUserApi } from './mockApi';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }
  return response.json();
}

export const userApi = {
  /**
   * Get current user information
   */
  async getMe(): Promise<User> {
    if (USE_MOCK_API) {
      return mockUserApi.getMe();
    }
    
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<User>(response);
  },

  /**
   * Update current user profile
   */
  async updateProfile(updates: UpdateUserRequest): Promise<User> {
    if (USE_MOCK_API) {
      return mockUserApi.updateProfile(updates);
    }
    
    const formData = new FormData();
    
    if (updates.username !== undefined) {
      formData.append('username', updates.username);
    }
    
    if (updates.avatar) {
      formData.append('avatar', updates.avatar);
    }

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      credentials: 'include',
      body: formData,
    });
    return handleResponse<User>(response);
  },
};
