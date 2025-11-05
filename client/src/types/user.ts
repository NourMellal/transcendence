export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  isTwoFAEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRequest {
  username?: string;
  avatar?: File;
}
