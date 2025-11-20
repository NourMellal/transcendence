import type { GameDatabase } from '../connection';

export interface Migration {
    readonly name: string;
    readonly up: (db: GameDatabase) => Promise<void>;
    readonly down?: (db: GameDatabase) => Promise<void>;
}
