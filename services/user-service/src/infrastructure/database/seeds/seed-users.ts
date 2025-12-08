import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { randomUUID } from 'crypto';

const PASSWORD_HASH = 'ca3eac75d7ad85bffb9fd631a19f07af:59702ad83ad9947f8fd8c1894211502e409c35392b08843abdcf25fa27f9e8b594d176d6a3b07e3c657028b19169dbebfd4dcee10fa9c39934072eeb5b4df34d';

const USERS = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'neo@transcendence.gg',
        username: 'neo',
        displayName: 'Neo',
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=neo',
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'trinity@transcendence.gg',
        username: 'trinity',
        displayName: 'Trinity',
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=trinity',
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'morpheus@transcendence.gg',
        username: 'morpheus',
        displayName: 'Morpheus',
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=morpheus',
    },
] as const;

async function main() {
    const db = await open({
        filename: process.env.USER_DB_PATH ?? 'data/users.db',
        driver: sqlite3.Database,
    });

    await db.exec(`
        PRAGMA foreign_keys = OFF;

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
    `);

    await db.run('DELETE FROM users;');
    await db.run('DELETE FROM friendships;');

    for (const user of USERS) {
        await db.run(
            `INSERT INTO users (id, email, username, password_hash, display_name, avatar, is_2fa_enabled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            user.id,
            user.email,
            user.username,
            PASSWORD_HASH,
            user.displayName,
            user.avatar,
            0,
        );
    }

    const insertFriendship = async (requester: string, addressee: string) => {
        await db.run(
            `INSERT OR IGNORE INTO friendships (
                id, requester_id, addressee_id, status,
                responded_at, blocked_by, note, created_at, updated_at
            ) VALUES (?, ?, ?, 'accepted', CURRENT_TIMESTAMP, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            randomUUID(),
            requester,
            addressee,
        );
    };

    await insertFriendship(USERS[0].id, USERS[1].id);

    console.log('✅ Seeded demo users into', process.env.USER_DB_PATH ?? 'data/users.db');
    await db.close();
}

main().catch((error) => {
    console.error('❌ Failed seeding user database:', error);
    process.exit(1);
});
