import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Friendship, FriendshipStatus, User } from '../../../domain/entities/user.entity.js';
import { FriendshipRepository } from '../../../domain/ports.js';

export class SQLiteFriendshipRepository implements FriendshipRepository {
    private db: Database | null = null;

    async initialize(dbPath: string = './data/users.db'): Promise<void> {
        this.db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Create friendships table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS friendships (
                id TEXT PRIMARY KEY,
                requester_id TEXT NOT NULL,
                addressee_id TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'BLOCKED', 'DECLINED')),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (requester_id, addressee_id)
            );

            CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
            CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
            CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
        `);
    }

    async findById(id: string): Promise<Friendship | null> {
        if (!this.db) throw new Error('Database not initialized');

        const row = await this.db.get(
            'SELECT * FROM friendships WHERE id = ?',
            [id]
        );

        return row ? this.mapRowToFriendship(row) : null;
    }

    async findByUsers(userId1: string, userId2: string): Promise<Friendship | null> {
        if (!this.db) throw new Error('Database not initialized');

        const row = await this.db.get(`
            SELECT * FROM friendships 
            WHERE (requester_id = ? AND addressee_id = ?) 
               OR (requester_id = ? AND addressee_id = ?)
        `, [userId1, userId2, userId2, userId1]);

        return row ? this.mapRowToFriendship(row) : null;
    }

    async findFriendsByUserId(userId: string): Promise<User[]> {
        if (!this.db) throw new Error('Database not initialized');

        const rows = await this.db.all(`
            SELECT u.* FROM users u
            INNER JOIN friendships f ON (
                (f.requester_id = ? AND f.addressee_id = u.id) OR
                (f.addressee_id = ? AND f.requester_id = u.id)
            )
            WHERE f.status = 'ACCEPTED'
        `, [userId, userId]);

        return rows.map(this.mapRowToUser);
    }

    async findPendingRequestsByUserId(userId: string): Promise<Friendship[]> {
        if (!this.db) throw new Error('Database not initialized');

        const rows = await this.db.all(`
            SELECT * FROM friendships 
            WHERE addressee_id = ? AND status = 'PENDING'
            ORDER BY created_at DESC
        `, [userId]);

        return rows.map(this.mapRowToFriendship);
    }

    async findSentRequestsByUserId(userId: string): Promise<Friendship[]> {
        if (!this.db) throw new Error('Database not initialized');

        const rows = await this.db.all(`
            SELECT * FROM friendships 
            WHERE requester_id = ? AND status = 'PENDING'
            ORDER BY created_at DESC
        `, [userId]);

        return rows.map(this.mapRowToFriendship);
    }

    async save(friendship: Friendship): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.run(
            `INSERT INTO friendships (
                id, requester_id, addressee_id, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                friendship.id,
                friendship.requesterId,
                friendship.addresseeId,
                friendship.status,
                friendship.createdAt.toISOString(),
                friendship.updatedAt.toISOString(),
            ]
        );
    }

    async update(id: string, updates: Partial<Friendship>): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const fields: string[] = [];
        const values: any[] = [];

        if (updates.status !== undefined) {
            fields.push('status = ?');
            values.push(updates.status);
        }

        if (updates.updatedAt !== undefined) {
            fields.push('updated_at = ?');
            values.push(updates.updatedAt.toISOString());
        }

        if (fields.length === 0) return;

        values.push(id);

        await this.db.run(
            `UPDATE friendships SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
    }

    async delete(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.run('DELETE FROM friendships WHERE id = ?', [id]);
    }

    private mapRowToFriendship(row: any): Friendship {
        return {
            id: row.id,
            requesterId: row.requester_id,
            addresseeId: row.addressee_id,
            status: row.status as FriendshipStatus,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
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