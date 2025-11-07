import { User } from '../../domain/user/entity';
import { SessionStore } from '../../domain/user/ports';

// MOCK IMPLEMENTATION - Replace with real SQLite session storage for production
export class MockSqliteSessionStore implements SessionStore {
  private sessions: Map<string, User> = new Map(); // Mock in-memory storage

  constructor(private db: any) {
    // TODO: Initialize real SQLite database connection
    console.log('MOCK: SessionStore initialized with in-memory storage (replace with SQLite)');
  }

  async get(sessionId: string): Promise<User | null> {
    // MOCK: Using in-memory Map instead of SQLite
    console.log(`MOCK: Getting session: ${sessionId}`);
    return this.sessions.get(sessionId) || null;
  }

  async set(sessionId: string, user: User): Promise<void> {
    // MOCK: Using in-memory Map instead of SQLite
    console.log(`MOCK: Setting session: ${sessionId} for user ${user.username}`);
    this.sessions.set(sessionId, user);
  }

  async delete(sessionId: string): Promise<void> {
    // MOCK: Using in-memory Map instead of SQLite
    console.log(`MOCK: Deleting session: ${sessionId}`);
    this.sessions.delete(sessionId);
  }
}
