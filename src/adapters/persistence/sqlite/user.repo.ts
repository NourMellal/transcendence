import { User } from '../../../domain/user/entity';
import { UserRepo } from '../../../domain/user/ports';

// MOCK IMPLEMENTATION - Replace with real SQLite database integration for production
export class MockSqliteUserRepo implements UserRepo {
  constructor(private db: any) {
    // TODO: Initialize real SQLite database connection
    console.log('MOCK: SqliteUserRepo initialized without real database');
  }

  async findById(id: string): Promise<User | null> {
    // MOCK: In production, implement real SQLite query using this.db
    console.log(`MOCK: Finding user by ID: ${id}`);
    return null; // Mock: no user found
  }

  async findByEmail(email: string): Promise<User | null> {
    // MOCK: In production, implement real SQLite query using this.db
    console.log(`MOCK: Finding user by email: ${email}`);
    return null; // Mock: no user found
  }

  async save(user: User): Promise<void> {
    // MOCK: In production, implement real SQLite insert using this.db
    console.log(`MOCK: Saving user: ${user.username} (${user.email})`);
  }

  async update(id: string, updates: Partial<User>): Promise<void> {
    // MOCK: In production, implement real SQLite update using this.db
    console.log(`MOCK: Updating user ${id} with:`, updates);
  }
}
