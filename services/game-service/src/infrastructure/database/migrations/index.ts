import { GameDatabase } from '../connection';
import * as migration001 from './001_create_games_table';
import * as migration002 from './002_add_tournament_id';

const migrations = [migration001, migration002];

export async function runMigrations(db: GameDatabase): Promise<void> {
    for (const migration of migrations) {
        await migration.up(db);
    }
}
