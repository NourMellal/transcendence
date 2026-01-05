import type { TournamentDatabase } from '../connection';
import { migration as createTournamentTables } from './001_create_tournament_tables';
import { Migration } from './types';

const migrations: Migration[] = [createTournamentTables];

export async function runMigrations(db: TournamentDatabase): Promise<void> {
    await ensureMigrationsTable(db);
    const appliedMigrations = await getAppliedMigrationNames(db);

    for (const migration of migrations) {
        if (appliedMigrations.has(migration.name)) {
            continue;
        }

        await db.exec('BEGIN');
        try {
            await migration.up(db);
            await db.run('INSERT INTO _migrations (name) VALUES (?)', migration.name);
            await db.exec('COMMIT');
            appliedMigrations.add(migration.name);
        } catch (error) {
            await db.exec('ROLLBACK');
            throw error;
        }
    }
}

async function ensureMigrationsTable(db: TournamentDatabase): Promise<void> {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);
}

async function getAppliedMigrationNames(db: TournamentDatabase): Promise<Set<string>> {
    const rows = (await db.all('SELECT name FROM _migrations;')) as Array<{ name: string }>;
    return new Set(rows.map((row) => row.name));
}
