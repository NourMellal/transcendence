import { User } from '../../domain/user/entity';
import { UserRepo, SessionStore } from '../../domain/user/ports';

export interface GetMeUseCase {
  execute(sessionId: string): Promise<User | null>;
}

export class GetMeUseCaseImpl implements GetMeUseCase {
  constructor(
    private userRepo: UserRepo,
    private sessionStore: SessionStore
  ) {}

  async execute(sessionId: string): Promise<User | null> {
    return this.sessionStore.get(sessionId);
  }
}
