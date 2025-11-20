import { GameDatabase } from '../connection';

export async function up(db: GameDatabase): Promise<void> {
    await db.exec('ALTER TABLE games ADD COLUMN tournament_id TEXT;');
    await db.exec('ALTER TABLE games ADD COLUMN started_at TEXT;');
    await db.exec('ALTER TABLE games ADD COLUMN finished_at TEXT;');
}

export async function down(db: GameDatabase): Promise<void> {
    await db.exec('CREATE TABLE IF NOT EXISTS games_tmp AS SELECT id, status, mode, snapshot, created_at, updated_at FROM games;');
    await db.exec('DROP TABLE games;');
    await db.exec('ALTER TABLE games_tmp RENAME TO games;');
}
