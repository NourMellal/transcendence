// Types matching the OpenAPI spec

export type UserStatus = 'ONLINE' | 'OFFLINE' | 'INGAME';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  is2FAEnabled: boolean;
  status: UserStatus;
}

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  message?: string;
}

export interface UpdateUserRequest {
  username?: string;
  avatar?: File;
}
