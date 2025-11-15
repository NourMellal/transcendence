import type { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import type { UserPresenceRepository } from '../../../domain/ports.js';
import { PresenceStatus, type UserPresence } from '../../../domain/entities/presence.entity.js';

export class SQLitePresenceRepository implements UserPresenceRepository {
    private db: Database | null = null;

    async initialize(dbPath: string = './data/users.db', existingDb?: Database): Promise<void> {
        this.db = existingDb ?? (await open({ filename: dbPath, driver: sqlite3.Database }));

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_presence (
                user_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                last_seen_at TEXT NOT NULL
            );
        `);
    }

    async upsert(userId: string, status: PresenceStatus, lastSeenAt: Date): Promise<void> {
        const db = this.ensureDb();
        await db.run(
            `INSERT INTO user_presence (user_id, status, last_seen_at)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
                status = excluded.status,
                last_seen_at = excluded.last_seen_at`,
            [userId, status, lastSeenAt.toISOString()]
        );
    }

    async findByUserId(userId: string): Promise<UserPresence | null> {
        const db = this.ensureDb();
        const row = await db.get('SELECT * FROM user_presence WHERE user_id = ?', [userId]);
        if (!row) {
            return null;
        }
        return {
            userId: row.user_id,
            status: row.status as PresenceStatus,
            lastSeenAt: new Date(row.last_seen_at),
        };
    }

    async markOffline(userId: string, lastSeenAt: Date): Promise<void> {
        await this.upsert(userId, PresenceStatus.OFFLINE, lastSeenAt);
    }

    private ensureDb(): Database {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }
}
