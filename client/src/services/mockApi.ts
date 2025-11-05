import { User, UpdateUserRequest } from '../types/user';

// Mock user data for testing
let mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'user@example.com',
  username: 'great_ponger',
  avatar: undefined,
  isTwoFAEnabled: false,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date().toISOString(),
};

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockUserApi = {
  /**
   * Get current user information (mock)
   */
  async getMe(): Promise<User> {
    await delay(500); // Simulate network delay
    return { ...mockUser };
  },

  /**
   * Update current user profile (mock)
   */
  async updateProfile(updates: UpdateUserRequest): Promise<User> {
    await delay(800); // Simulate network delay
    
    if (updates.username !== undefined) {
      mockUser.username = updates.username;
    }
    
    if (updates.avatar) {
      // Simulate file upload by creating a data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(updates.avatar!);
      });
      mockUser.avatar = dataUrl;
    }
    
    mockUser.updatedAt = new Date().toISOString();
    return { ...mockUser };
  },
};
