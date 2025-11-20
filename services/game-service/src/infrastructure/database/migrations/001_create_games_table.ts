import { GameDatabase } from '../connection';

export async function up(db: GameDatabase): Promise<void> {
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
}

export async function down(db: GameDatabase): Promise<void> {
    await db.exec('DROP TABLE IF EXISTS games;');
}
