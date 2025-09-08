import { User } from '../../domain/user/entity';
import { UserRepo, SessionStore } from '../../domain/user/ports';

export interface Handle42CallbackInput {
  code: string;
  state: string;
}

export interface Handle42CallbackOutput {
  user: User;
  sessionId: string;
}

export class Handle42CallbackUseCase {
  constructor(
    private userRepo: UserRepo,
    private sessionStore: SessionStore,
    private oauth42Client: any // TODO: define proper interface
  ) {}

  async execute(input: Handle42CallbackInput): Promise<Handle42CallbackOutput> {
    // Exchange code for token
    const tokenResponse = await this.oauth42Client.exchangeCode(input.code);

    // Get user info from 42
    const userInfo = await this.oauth42Client.getUserInfo(tokenResponse.access_token);

    // Find or create user
    let user = await this.userRepo.findByEmail(userInfo.email);
    if (!user) {
      user = {
        id: userInfo.id.toString(),
        email: userInfo.email,
        username: userInfo.login,
        isTwoFAEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await this.userRepo.save(user);
    }
    const sessionId = Math.random().toString(36).substring(7);
    await this.sessionStore.set(sessionId, user);
    return { sessionId, user };
  }
}
