import { Migration } from './types';

export const migration: Migration = {
    name: '001_create_tournament_tables',
    up: async (db) => {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                creator_id TEXT NOT NULL,
                status TEXT NOT NULL,
                bracket_type TEXT NOT NULL DEFAULT 'single_elimination',
                max_participants INTEGER NOT NULL DEFAULT 8,
                min_participants INTEGER NOT NULL DEFAULT 4,
                current_participants INTEGER NOT NULL DEFAULT 0,
                is_public INTEGER NOT NULL DEFAULT 1,
                access_code TEXT UNIQUE,
                passcode_hash TEXT,
                ready_to_start INTEGER NOT NULL DEFAULT 0,
                ready_at TEXT,
                start_timeout_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                started_at TEXT,
                finished_at TEXT,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);

        await db.exec(`CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments (status);`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_tournaments_access_code ON tournaments (access_code);`);
        await db.exec(
            `CREATE INDEX IF NOT EXISTS idx_tournaments_start_timeout ON tournaments (start_timeout_at) WHERE status = 'recruiting';`
        );

        await db.exec(`
            CREATE TABLE IF NOT EXISTS tournament_participants (
                id TEXT PRIMARY KEY,
                tournament_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                joined_at TEXT NOT NULL DEFAULT (datetime('now')),
                status TEXT NOT NULL DEFAULT 'joined'
            );
        `);

        await db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_participant_unique
            ON tournament_participants (tournament_id, user_id);
        `);
        await db.exec(
            `CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants (tournament_id);`
        );

        await db.exec(`
            CREATE TABLE IF NOT EXISTS tournament_matches (
                id TEXT PRIMARY KEY,
                tournament_id TEXT NOT NULL,
                round INTEGER NOT NULL,
                match_position INTEGER NOT NULL,
                player1_id TEXT,
                player2_id TEXT,
                game_id TEXT,
                winner_id TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                started_at TEXT,
                finished_at TEXT,
                UNIQUE(tournament_id, round, match_position)
            );
        `);

        await db.exec(
            `CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches (tournament_id);`
        );
        await db.exec(
            `CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches (tournament_id, round);`
        );

        await db.exec(`
            CREATE TABLE IF NOT EXISTS tournament_bracket_states (
                id TEXT PRIMARY KEY,
                tournament_id TEXT NOT NULL,
                bracket_json TEXT NOT NULL,
                version INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(tournament_id, version)
            );
        `);

        await db.exec(
            `CREATE INDEX IF NOT EXISTS idx_tournament_bracket_states_tournament ON tournament_bracket_states (tournament_id);`
        );
    },
    down: async (db) => {
        await db.exec('DROP TABLE IF EXISTS tournament_bracket_states;');
        await db.exec('DROP TABLE IF EXISTS tournament_matches;');
        await db.exec('DROP TABLE IF EXISTS tournament_participants;');
        await db.exec('DROP TABLE IF EXISTS tournaments;');
    }
};
