import { User } from '../domain/user.entity';
import { SessionStore, UserRepository } from '../../ports/interfaces/user-ports';

export interface GetMeUseCase {
  execute(sessionId: string): Promise<User | null>;
}

export class GetMeUseCaseImpl implements GetMeUseCase {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly userRepository: UserRepository
  ) {}

  async execute(sessionId: string): Promise<User | null> {
    if (!sessionId) {
      return null;
    }

    const user = await this.sessionStore.get(sessionId);
    if (!user) {
      return null;
    }

    // Optionally refresh user data from repository
    const refreshedUser = await this.userRepository.findById(user.id);
    return refreshedUser;
  }
}
