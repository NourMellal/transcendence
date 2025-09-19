import { User, UserEntity } from '../../core/domain/user.entity';
import { UserRepository } from '../../ports/interfaces/user-ports';

// Mock database client - in a real app, this would be Prisma or another ORM
interface DbClient {
  query(sql: string, params: any[]): Promise<any>;
}

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly dbClient: DbClient) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.dbClient.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!result || result.length === 0) {
      return null;
    }

    return new UserEntity({
      id: result[0].id,
      email: result[0].email,
      username: result[0].username,
      avatar: result[0].avatar,
      twoFASecret: result[0].twoFASecret,
      isTwoFAEnabled: result[0].isTwoFAEnabled === 1,
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt)
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.dbClient.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!result || result.length === 0) {
      return null;
    }

    return new UserEntity({
      id: result[0].id,
      email: result[0].email,
      username: result[0].username,
      avatar: result[0].avatar,
      twoFASecret: result[0].twoFASecret,
      isTwoFAEnabled: result[0].isTwoFAEnabled === 1,
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt)
    });
  }

  async save(user: User): Promise<void> {
    await this.dbClient.query(
      `INSERT INTO users (id, email, username, avatar, twoFASecret, isTwoFAEnabled, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.email,
        user.username,
        user.avatar,
        user.twoFASecret,
        user.isTwoFAEnabled ? 1 : 0,
        user.createdAt.toISOString(),
        user.updatedAt.toISOString()
      ]
    );
  }

  async update(id: string, updates: Partial<User>): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];

    // Build dynamic SET clauses
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        setClauses.push(`${key} = ?`);

        // Handle booleans for SQLite
        if (key === 'isTwoFAEnabled') {
          params.push(value ? 1 : 0);
        } else if (key === 'createdAt' || key === 'updatedAt') {
          params.push((value as Date).toISOString());
        } else {
          params.push(value);
        }
      }
    });

    if (setClauses.length === 0) {
      return;
    }

    // Always update the updatedAt timestamp
    if (!updates.updatedAt) {
      setClauses.push('updatedAt = ?');
      params.push(new Date().toISOString());
    }

    // Add the id to the params
    params.push(id);

    await this.dbClient.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
  }
}
