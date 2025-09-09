import { User } from '../../domain/user/entity';
import { UserRepo, SessionStore, TwoFAService } from '../../domain/user/ports';

export interface Enable2FAUseCase {
  execute(sessionId: string, secret: string, token: string): Promise<void>;
}

export class Enable2FAUseCaseImpl implements Enable2FAUseCase {
  constructor(
    private userRepo: UserRepo,
    private sessionStore: SessionStore,
    private twoFAService: TwoFAService
  ) {}

  async execute(sessionId: string, secret: string, token: string): Promise<void> {
    const user = await this.sessionStore.get(sessionId);
    if (!user) throw new Error('User not found');

    if (!this.twoFAService.verifyToken(secret, token)) {
      throw new Error('Invalid 2FA token');
    }

    await this.userRepo.update(user.id, { twoFASecret: secret, isTwoFAEnabled: true });
    const updatedUser = { ...user, twoFASecret: secret, isTwoFAEnabled: true };
    await this.sessionStore.set(sessionId, updatedUser);
  }
}
