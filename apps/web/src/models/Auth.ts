/**
 * Authentication-related DTOs
 */

import type { User } from './User';

/**
 * Sign up request DTO
 */
export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Login request DTO
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response DTO
 */
export interface LoginResponse {
  user: User;
  message?: string;
}
