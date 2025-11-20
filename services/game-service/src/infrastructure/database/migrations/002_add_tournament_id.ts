import { Migration } from './types';
import type { GameDatabase } from '../connection';

async function columnExists(db: GameDatabase, table: string, column: string): Promise<boolean> {
    const columns = (await db.all(`PRAGMA table_info(${table});`)) as Array<{ name: string }>;
    return columns.some((col) => col.name === column);
}

async function addColumnIfMissing(db: GameDatabase, table: string, columnDefinition: string, columnName: string): Promise<void> {
    const exists = await columnExists(db, table, columnName);
    if (!exists) {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDefinition};`);
    }
}

export const migration: Migration = {
    name: '002_add_tournament_fields',
    up: async (db) => {
        await addColumnIfMissing(db, 'games', 'tournament_id TEXT', 'tournament_id');
        await addColumnIfMissing(db, 'games', 'started_at TEXT', 'started_at');
        await addColumnIfMissing(db, 'games', 'finished_at TEXT', 'finished_at');
    },
    down: async (db) => {
        await db.exec(
            'CREATE TABLE IF NOT EXISTS games_tmp AS SELECT id, status, mode, snapshot, created_at, updated_at FROM games;'
        );
        await db.exec('DROP TABLE games;');
        await db.exec('ALTER TABLE games_tmp RENAME TO games;');
    }
};
