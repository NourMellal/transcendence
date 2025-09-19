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

export class UserEntity implements User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  twoFASecret?: string;
  isTwoFAEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: User) {
    this.id = props.id;
    this.email = props.email;
    this.username = props.username;
    this.avatar = props.avatar;
    this.twoFASecret = props.twoFASecret;
    this.isTwoFAEnabled = props.isTwoFAEnabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public enableTwoFA(secret: string): void {
    this.twoFASecret = secret;
    this.isTwoFAEnabled = true;
    this.updatedAt = new Date();
  }

  public disableTwoFA(): void {
    this.twoFASecret = undefined;
    this.isTwoFAEnabled = false;
    this.updatedAt = new Date();
  }

  public updateProfile(props: Partial<Pick<User, 'username' | 'email' | 'avatar'>>): void {
    if (props.username) this.username = props.username;
    if (props.email) this.email = props.email;
    if (props.avatar) this.avatar = props.avatar;
    this.updatedAt = new Date();
  }
}
