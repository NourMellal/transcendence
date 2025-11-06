/**
 * Frontend data models (DTOs) - Plain TypeScript interfaces
 * These match the OpenAPI spec but are frontend-specific
 */

export type UserStatus = 'ONLINE' | 'OFFLINE' | 'INGAME';

/**
 * User model matching OpenAPI User schema
 */
export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  is2FAEnabled: boolean;
  status: UserStatus;
}

/**
 * Request DTO for updating user profile
 */
export interface UpdateUserRequest {
  username?: string;
  avatar?: File;
}
