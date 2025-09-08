import { User } from '../../domain/user/entity';

export class UserMapper {
  static toDto(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      isTwoFAEnabled: user.isTwoFAEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
