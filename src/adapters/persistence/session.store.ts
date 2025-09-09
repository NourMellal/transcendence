import { User } from '../../domain/user/entity';
import { SessionStore } from '../../domain/user/ports';

export class SqliteSessionStore implements SessionStore {
  constructor(private db: any) {} // TODO: proper DB type

  async get(sessionId: string): Promise<User | null> {
    // Implement session retrieval
    return null;
  }

  async set(sessionId: string, user: User): Promise<void> {
    // Implement session storage
  }

  async delete(sessionId: string): Promise<void> {
    // Implement session deletion
  }
}
