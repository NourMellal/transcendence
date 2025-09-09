import { User } from '../../domain/user/entity';
import { UserRepo, SessionStore, TwoFAService } from '../../domain/user/ports';

export interface Generate2FAUseCase {
  execute(sessionId: string): Promise<{ secret: string; qrCode: string }>;
}

export class Generate2FAUseCaseImpl implements Generate2FAUseCase {
  constructor(
    private userRepo: UserRepo,
    private sessionStore: SessionStore,
    private twoFAService: TwoFAService
  ) {}

  async execute(sessionId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.sessionStore.get(sessionId);
    if (!user) throw new Error('User not found');

    const secret = this.twoFAService.generateSecret();
    const qrCode = await this.twoFAService.generateQRCode(secret, user.username);

    return { secret, qrCode };
  }
}
