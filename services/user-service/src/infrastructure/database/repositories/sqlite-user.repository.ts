import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { User, createUser } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/ports';
import { DisplayName, Email, UserId, Username } from '../../../domain/value-objects';

export class SQLiteUserRepository implements UserRepository {
    private db: Database | null = null;

    async initialize(dbPath: string = './data/users.db', existingDb?: Database): Promise<void> {
        this.db = existingDb ?? (await open({
            filename: dbPath,
            driver: sqlite3.Database
        }));

        // Create users table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                display_name TEXT UNIQUE NOT NULL,
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
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
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
            'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
            [username]
        );

        return row ? this.mapRowToUser(row) : null;
    }

    async findByDisplayName(displayName: string): Promise<User | null> {
        if (!this.db) throw new Error('Database not initialized');

        const row = await this.db.get(
            'SELECT * FROM users WHERE display_name = ?',
            [displayName]
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
                user.id.toString(),
                user.email.toString(),
                user.username.toString(),
                user.passwordHash || null,
                user.displayName.toString(),
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
        const values: Array<string | number | null> = [];

        if (updates.email !== undefined) {
            fields.push('email = ?');
            values.push(updates.email.toString());
        }
        if (updates.username !== undefined) {
            fields.push('username = ?');
            values.push(updates.username.toString());
        }
        if (updates.displayName !== undefined) {
            fields.push('display_name = ?');
            values.push(updates.displayName.toString());
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

    async search(query: string, limit: number = 10): Promise<User[]> {
        if (!this.db) throw new Error('Database not initialized');

        const searchPattern = `%${query}%`;
        const rows = await this.db.all(
            `SELECT * FROM users 
             WHERE LOWER(username) LIKE LOWER(?) 
                OR LOWER(display_name) LIKE LOWER(?) 
                OR LOWER(email) LIKE LOWER(?)
             LIMIT ?`,
            [searchPattern, searchPattern, searchPattern, limit]
        );

        return rows.map(row => this.mapRowToUser(row));
    }

    async listAll(limit: number = 100, offset: number = 0): Promise<User[]> {
        if (!this.db) throw new Error('Database not initialized');

        const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(1000, Math.floor(limit))) : 100;
        const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;

        const rows = await this.db.all(
            `SELECT * FROM users ORDER BY created_at ASC LIMIT ? OFFSET ?`,
            [safeLimit, safeOffset]
        );

        return rows.map((row) => this.mapRowToUser(row));
    }

    private mapRowToUser(row: Record<string, unknown>): User {
        const oauthProviderRaw = typeof row.oauth_provider === 'string' ? row.oauth_provider : undefined;
        const oauthProvider: 'local' | '42' | undefined =
            oauthProviderRaw === 'local' || oauthProviderRaw === '42' ? oauthProviderRaw : undefined;

        return createUser({
            id: new UserId(String(row.id)),
            email: new Email(String(row.email)),
            username: new Username(String(row.username)),
            passwordHash: typeof row.password_hash === 'string' ? row.password_hash : undefined,
            displayName: row.display_name ? new DisplayName(String(row.display_name)) : undefined,
            avatar: typeof row.avatar === 'string' ? row.avatar : undefined,
            twoFASecret: typeof row.two_fa_secret === 'string' ? row.two_fa_secret : undefined,
            is2FAEnabled: row.is_2fa_enabled === 1,
            oauthProvider,
            oauthId: typeof row.oauth_id === 'string' ? row.oauth_id : undefined,
            createdAt: new Date(String(row.created_at)),
            updatedAt: new Date(String(row.updated_at)),
        });
    }
}
