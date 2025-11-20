import { Migration } from './types';

export const migration: Migration = {
    name: '001_create_games_table',
    up: async (db) => {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                mode TEXT NOT NULL,
                snapshot TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);
    },
    down: async (db) => {
        await db.exec('DROP TABLE IF EXISTS games;');
    }
};
