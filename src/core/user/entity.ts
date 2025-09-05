export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  twoFASecret?: string;
  isTwoFAEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
