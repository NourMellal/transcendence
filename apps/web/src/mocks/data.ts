import type { User } from '../models/User';

// Mock user data that matches the User model from OpenAPI spec
export const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'great_ponger',
  email: 'user@example.com',
  avatar: 'https://example.com/avatars/user1.png',
  isTwoFAEnabled: false,
  status: 'ONLINE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// State management for mock
export let currentUser: User | null = null;
export let isAuthenticated = false;

export function setCurrentUser(user: User | null) {
  currentUser = user;
  isAuthenticated = user !== null;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function getIsAuthenticated(): boolean {
  return isAuthenticated;
}
