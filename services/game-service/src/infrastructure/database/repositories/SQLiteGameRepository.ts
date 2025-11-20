import { Game } from '../../../domain/entities';
import { GameStatus } from '../../../domain/value-objects';
import { GameDatabase } from '../connection';
import { IGameRepository, ListGamesParams } from '../../../application/ports/repositories/IGameRepository';

interface GameRow {
    id: string;
    status: string;
    mode: string;
    snapshot: string;
    tournament_id?: string;
    created_at: string;
    updated_at: string;
    started_at?: string;
    finished_at?: string;
}

export class SQLiteGameRepository implements IGameRepository {
    constructor(private readonly db: GameDatabase) {}

    async create(game: Game): Promise<void> {
        const snapshot = JSON.stringify(game.toSnapshot());
        await this.db.run(
            `INSERT INTO games (id, status, mode, snapshot, tournament_id, created_at, updated_at, started_at, finished_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            game.id,
            game.status,
            game.mode,
            snapshot,
            game.tournamentId ?? null,
            game.createdAt.toISOString(),
            game.updatedAt.toISOString(),
            game.startedAt?.toISOString() ?? null,
            game.finishedAt?.toISOString() ?? null
        );
    }

    async update(game: Game): Promise<void> {
        const snapshot = JSON.stringify(game.toSnapshot());
        await this.db.run(
            `UPDATE games
             SET status = ?, mode = ?, snapshot = ?, tournament_id = ?, updated_at = ?, started_at = ?, finished_at = ?
             WHERE id = ?`,
            game.status,
            game.mode,
            snapshot,
            game.tournamentId ?? null,
            game.updatedAt.toISOString(),
            game.startedAt?.toISOString() ?? null,
            game.finishedAt?.toISOString() ?? null,
            game.id
        );
    }

    async findById(id: string): Promise<Game | null> {
        const row = await this.db.get<GameRow>(`SELECT * FROM games WHERE id = ?`, id);
        return row ? this.mapRowToGame(row) : null;
    }

    async list(params?: ListGamesParams): Promise<Game[]> {
        let query = 'SELECT * FROM games';
        const filters: string[] = [];
        const values: unknown[] = [];

        if (params?.status) {
            filters.push('status = ?');
            values.push(params.status);
        }

        if (params?.mode) {
            filters.push('mode = ?');
            values.push(params.mode);
        }

        if (filters.length > 0) {
            query += ` WHERE ${filters.join(' AND ')}`;
        }

        query += ' ORDER BY created_at DESC';
        const rows = await this.db.all<GameRow[]>(query, values);
        return rows.map((row) => this.mapRowToGame(row));
    }

    async findActiveByPlayer(playerId: string): Promise<Game | null> {
        const rows = await this.db.all<GameRow[]>(`SELECT * FROM games WHERE status != ?`, GameStatus.FINISHED);
        for (const row of rows) {
            const game = this.mapRowToGame(row);
            if (game.players.some((player) => player.id === playerId)) {
                return game;
            }
        }
        return null;
    }

    private mapRowToGame(row: GameRow): Game {
        const snapshot = JSON.parse(row.snapshot);
        return Game.fromSnapshot(snapshot);
    }
}
