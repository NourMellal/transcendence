import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/ports';

export class SQLiteUserRepository implements UserRepository {
    private db: Database | null = null;

    async initialize(dbPath: string = './data/users.db'): Promise<void> {
        this.db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Create users table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                display_name TEXT,
                avatar TEXT,
                two_fa_secret TEXT,
                is_2fa_enabled INTEGER DEFAULT 0,
                oauth_provider TEXT DEFAULT 'local',
                oauth_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
        `);
    }

    async findById(id: string): Promise<User | null> {
        if (!this.db) throw new Error('Database not initialized');

        const row = await this.db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        return row ? this.mapRowToUser(row) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        if (!this.db) throw new Error('Database not initialized');

        const row = await this.db.get(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        return row ? this.mapRowToUser(row) : null;
    }

    async findByUsername(username: string): Promise<User | null> {
        if (!this.db) throw new Error('Database not initialized');

        const row = await this.db.get(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        return row ? this.mapRowToUser(row) : null;
    }

    async save(user: User): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.run(
            `INSERT INTO users (
                id, email, username, password_hash, display_name, avatar,
                two_fa_secret, is_2fa_enabled, oauth_provider, oauth_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id,
                user.email,
                user.username,
                user.passwordHash || null,
                user.displayName || null,
                user.avatar || null,
                user.twoFASecret || null,
                user.is2FAEnabled ? 1 : 0,
                user.oauthProvider || 'local',
                user.oauthId || null,
                user.createdAt.toISOString(),
                user.updatedAt.toISOString(),
            ]
        );
    }

    async update(id: string, updates: Partial<User>): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const fields: string[] = [];
        const values: any[] = [];

        if (updates.email !== undefined) {
            fields.push('email = ?');
            values.push(updates.email);
        }
        if (updates.username !== undefined) {
            fields.push('username = ?');
            values.push(updates.username);
        }
        if (updates.displayName !== undefined) {
            fields.push('display_name = ?');
            values.push(updates.displayName);
        }
        if (updates.avatar !== undefined) {
            fields.push('avatar = ?');
            values.push(updates.avatar);
        }
        if (updates.passwordHash !== undefined) {
            fields.push('password_hash = ?');
            values.push(updates.passwordHash);
        }
        if (updates.twoFASecret !== undefined) {
            fields.push('two_fa_secret = ?');
            values.push(updates.twoFASecret);
        }
        if (updates.is2FAEnabled !== undefined) {
            fields.push('is_2fa_enabled = ?');
            values.push(updates.is2FAEnabled ? 1 : 0);
        }

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        await this.db.run(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
    }

    async delete(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.run('DELETE FROM users WHERE id = ?', [id]);
    }

    private mapRowToUser(row: any): User {
        return {
            id: row.id,
            email: row.email,
            username: row.username,
            passwordHash: row.password_hash,
            displayName: row.display_name,
            avatar: row.avatar,
            twoFASecret: row.two_fa_secret,
            is2FAEnabled: row.is_2fa_enabled === 1,
            oauthProvider: row.oauth_provider,
            oauthId: row.oauth_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}
