import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import type { Session } from '../../../domain/entities/user.entity';
import type { SessionRepository } from '../../../domain/ports';

export class SQLiteSessionRepository implements SessionRepository {
    private db: Database | null = null;

    async initialize(dbPath: string = './data/users.db', existingDb?: Database): Promise<void> {
        this.db = existingDb ?? (await open({
            filename: dbPath,
            driver: sqlite3.Database
        }));

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        `);
    }

    async findByToken(token: string): Promise<Session | null> {
        const db = this.ensureDb();
        const row = await db.get('SELECT * FROM sessions WHERE token = ?', [token]);
        return row ? this.mapRow(row) : null;
    }

    async findByUserId(userId: string): Promise<Session[]> {
        const db = this.ensureDb();
        const rows = await db.all('SELECT * FROM sessions WHERE user_id = ?', [userId]);
        return rows.map(row => this.mapRow(row));
    }

    async save(session: Session): Promise<void> {
        const db = this.ensureDb();
        await db.run(
            `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
                session.id,
                session.userId,
                session.token,
                session.expiresAt.toISOString(),
                session.createdAt.toISOString(),
            ]
        );
    }

    async delete(token: string): Promise<void> {
        const db = this.ensureDb();
        await db.run('DELETE FROM sessions WHERE token = ?', [token]);
    }

    async deleteAllForUser(userId: string): Promise<void> {
        const db = this.ensureDb();
        await db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
    }

    private ensureDb(): Database {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }

    private mapRow(row: any): Session {
        return {
            id: row.id,
            userId: row.user_id,
            token: row.token,
            expiresAt: new Date(row.expires_at),
            createdAt: new Date(row.created_at),
        };
    }
}
