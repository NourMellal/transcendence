import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import {
    Friendship,
    FriendshipStatus,
} from '../../../domain/entities/friendship.entity';
import { FriendshipRepository } from '../../../domain/ports';

export class SQLiteFriendshipRepository implements FriendshipRepository {
    private db: Database | null = null;

    async initialize(dbPath: string = './data/users.db', existingDb?: Database): Promise<void> {
        this.db = existingDb ?? (await open({
            filename: dbPath,
            driver: sqlite3.Database,
        }));

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS friendships (
                id TEXT PRIMARY KEY,
                requester_id TEXT NOT NULL,
                addressee_id TEXT NOT NULL,
                status TEXT NOT NULL,
                responded_at TEXT,
                blocked_by TEXT,
                note TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                CHECK (requester_id <> addressee_id),
                CHECK (status IN ('pending','accepted','rejected','blocked'))
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair
                ON friendships(requester_id, addressee_id);

            CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status
                ON friendships(addressee_id, status);

            CREATE INDEX IF NOT EXISTS idx_friendships_requester_status
                ON friendships(requester_id, status);
        `);
    }

    async findById(id: string): Promise<Friendship | null> {
        const db = this.ensureDb();
        const row = await db.get('SELECT * FROM friendships WHERE id = ?', [id]);
        return row ? this.mapRow(row) : null;
    }

    async findBetweenUsers(userId: string, otherUserId: string): Promise<Friendship | null> {
        const db = this.ensureDb();
        const row = await db.get(
            `
            SELECT * FROM friendships
            WHERE (requester_id = ? AND addressee_id = ?)
               OR (requester_id = ? AND addressee_id = ?)
            `,
            [userId, otherUserId, otherUserId, userId]
        );
        return row ? this.mapRow(row) : null;
    }

    async listForUser(userId: string, statuses?: FriendshipStatus[]): Promise<Friendship[]> {
        const db = this.ensureDb();
        const params: any[] = [userId, userId];
        let statusClause = '';

        if (statuses && statuses.length > 0) {
            const placeholders = statuses.map(() => '?').join(', ');
            statusClause = `AND status IN (${placeholders})`;
            params.push(...statuses);
        }

        const rows = await db.all(
            `
            SELECT * FROM friendships
            WHERE (requester_id = ? OR addressee_id = ?)
            ${statusClause}
            ORDER BY updated_at DESC
            `,
            params
        );

        return rows.map(row => this.mapRow(row));
    }

    async listPendingForUser(userId: string): Promise<Friendship[]> {
        const db = this.ensureDb();
        const rows = await db.all(
            `
            SELECT * FROM friendships
            WHERE addressee_id = ?
              AND status = ?
            ORDER BY created_at ASC
            `,
            [userId, FriendshipStatus.PENDING]
        );
        return rows.map(row => this.mapRow(row));
    }

    async save(friendship: Friendship): Promise<void> {
        const db = this.ensureDb();
        await db.run(
            `
            INSERT INTO friendships (
                id, requester_id, addressee_id, status,
                responded_at, blocked_by, note, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                friendship.id,
                friendship.requesterId,
                friendship.addresseeId,
                friendship.status,
                friendship.respondedAt?.toISOString() ?? null,
                friendship.blockedBy ?? null,
                friendship.note ?? null,
                friendship.createdAt.toISOString(),
                friendship.updatedAt.toISOString(),
            ]
        );
    }

    async update(id: string, updates: Partial<Friendship>): Promise<void> {
        const db = this.ensureDb();
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.status !== undefined) {
            fields.push('status = ?');
            values.push(updates.status);
        }
        if (updates.respondedAt !== undefined) {
            fields.push('responded_at = ?');
            values.push(updates.respondedAt ? updates.respondedAt.toISOString() : null);
        }
        if (updates.blockedBy !== undefined) {
            fields.push('blocked_by = ?');
            values.push(updates.blockedBy ?? null);
        }
        if (updates.note !== undefined) {
            fields.push('note = ?');
            values.push(updates.note ?? null);
        }
        if (updates.requesterId !== undefined) {
            fields.push('requester_id = ?');
            values.push(updates.requesterId);
        }
        if (updates.addresseeId !== undefined) {
            fields.push('addressee_id = ?');
            values.push(updates.addresseeId);
        }

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        await db.run(
            `UPDATE friendships SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
    }

    async delete(id: string): Promise<void> {
        const db = this.ensureDb();
        await db.run('DELETE FROM friendships WHERE id = ?', [id]);
    }

    async deleteAllForUser(userId: string): Promise<void> {
        const db = this.ensureDb();
        await db.run(
            `
            DELETE FROM friendships
            WHERE requester_id = ?
               OR addressee_id = ?
            `,
            [userId, userId]
        );
    }

    private ensureDb(): Database {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }

    private mapRow(row: any): Friendship {
        return {
            id: row.id,
            requesterId: row.requester_id,
            addresseeId: row.addressee_id,
            status: row.status as FriendshipStatus,
            respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
            blockedBy: row.blocked_by ?? undefined,
            note: row.note ?? undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}
