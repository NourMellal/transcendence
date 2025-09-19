import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { UserRepository } from '../../domain/ports.js';
import { User } from '../../domain/entities.js';

export class SqliteUserRepository implements UserRepository {
    constructor(private readonly db: Database) {
        this.initTable();
    }

    private async initTable(): Promise<void> {
        const createTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT,
        avatar TEXT,
        two_fa_secret TEXT,
        is_2fa_enabled BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
        await this.db.exec(createTable);
    }

    async findById(id: string): Promise<User | null> {
        const row = await this.db.get('SELECT * FROM users WHERE id = ?', id);

        if (!row) return null;

        return this.mapRowToUser(row);
    }

    async findByEmail(email: string): Promise<User | null> {
        const row = await this.db.get('SELECT * FROM users WHERE email = ?', email);

        if (!row) return null;

        return this.mapRowToUser(row);
    }

    async findByUsername(username: string): Promise<User | null> {
        const row = await this.db.get('SELECT * FROM users WHERE username = ?', username);

        if (!row) return null;

        return this.mapRowToUser(row);
    }

    async save(user: User): Promise<void> {
        await this.db.run(`
      INSERT INTO users (
        id, email, username, display_name, avatar, 
        two_fa_secret, is_2fa_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
            user.id,
            user.email,
            user.username,
            user.displayName || null,
            user.avatar || null,
            user.twoFASecret || null,
            user.is2FAEnabled ? 1 : 0,
            user.createdAt.toISOString(),
            user.updatedAt.toISOString()
        );
    }

    async update(id: string, updates: Partial<User>): Promise<void> {
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
        if (updates.twoFASecret !== undefined) {
            fields.push('two_fa_secret = ?');
            values.push(updates.twoFASecret);
        }
        if (updates.is2FAEnabled !== undefined) {
            fields.push('is_2fa_enabled = ?');
            values.push(updates.is2FAEnabled ? 1 : 0);
        }
        if (updates.updatedAt !== undefined) {
            fields.push('updated_at = ?');
            values.push(updates.updatedAt.toISOString());
        }

        if (fields.length === 0) return;

        values.push(id);
        await this.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM users WHERE id = ?', id);
    }

    private mapRowToUser(row: any): User {
        return {
            id: row.id,
            email: row.email,
            username: row.username,
            displayName: row.display_name || undefined,
            avatar: row.avatar || undefined,
            twoFASecret: row.two_fa_secret || undefined,
            is2FAEnabled: Boolean(row.is_2fa_enabled),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}