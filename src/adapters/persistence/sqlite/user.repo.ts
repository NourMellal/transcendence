import { User } from '../../../domain/user/entity';
import { UserRepo } from '../../../domain/user/ports';

export class SqliteUserRepo implements UserRepo {
  constructor(private db: any) {} // TODO: proper DB type

  async findById(id: string): Promise<User | null> {
    // Implement SQLite query
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // Implement SQLite query
    return null;
  }

  async save(user: User): Promise<void> {
    // Implement SQLite insert
  }

  async update(id: string, updates: Partial<User>): Promise<void> {
    // Implement SQLite update
  }
}
