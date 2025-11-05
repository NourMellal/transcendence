/**
 * Mock data for the API based on OpenAPI specification
 */

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  is2FAEnabled: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'INGAME';
}

export const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'great_ponger',
  email: 'user@example.com',
  avatar: 'https://example.com/avatars/user1.png',
  is2FAEnabled: false,
  status: 'ONLINE',
};

// Store for mutable user data during testing
export let currentUser: User = { ...mockUser };

export const updateCurrentUser = (updates: Partial<User>) => {
  currentUser = { ...currentUser, ...updates };
};

export const resetCurrentUser = () => {
  currentUser = { ...mockUser };
};
