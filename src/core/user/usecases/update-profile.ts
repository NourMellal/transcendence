import { User } from '../entity';
import { UserRepo, SessionStore, ImageStore } from '../ports';

export interface UpdateProfileUseCase {
  execute(sessionId: string, updates: Partial<User>, avatar?: Buffer): Promise<User>;
}

export class UpdateProfileUseCaseImpl implements UpdateProfileUseCase {
  constructor(
    private userRepo: UserRepo,
    private sessionStore: SessionStore,
    private imageStore: ImageStore
  ) {}

  async execute(sessionId: string, updates: Partial<User>, avatar?: Buffer): Promise<User> {
    const user = await this.sessionStore.get(sessionId);
    if (!user) throw new Error('User not found');

    let avatarPath: string | undefined;
    if (avatar) {
      avatarPath = await this.imageStore.save(avatar, `${user.id}-avatar.png`);
      updates.avatar = avatarPath;
    }

    await this.userRepo.update(user.id, updates);
    const updatedUser = { ...user, ...updates };
    await this.sessionStore.set(sessionId, updatedUser);
    return updatedUser;
  }
}
