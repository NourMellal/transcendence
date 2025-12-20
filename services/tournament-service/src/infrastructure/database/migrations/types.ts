import type { TournamentDatabase } from '../connection';

export interface Migration {
    readonly name: string;
    readonly up: (db: TournamentDatabase) => Promise<void>;
    readonly down?: (db: TournamentDatabase) => Promise<void>;
}
