import { Game, resolveSpeed } from '../../../domain/entities';
import { GameStatus, Position, Velocity } from '../../../domain/value-objects';
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
      let games = rows.map((row) => this.mapRowToGame(row));

      if (params?.playerId) {
        games = games.filter((game) => game.players.some((player) => player.id === params.playerId));
      }

      if (typeof params?.offset === 'number' && params.offset > 0) {
        games = games.slice(params.offset);
      }

      if (typeof params?.limit === 'number' && params.limit > 0) {
        games = games.slice(0, params.limit);
      }

      return games;
    }

    async findActiveByPlayer(playerId: string): Promise<Game | null> {
      const rows = await this.db.all<GameRow[]>(
        `SELECT *
         FROM games
         WHERE status NOT IN (?, ?)`,
        GameStatus.FINISHED,
        GameStatus.CANCELLED
      );
        for (const row of rows) {
            const game = this.mapRowToGame(row);
            if (game.players.some((player) => player.id === playerId)) {
                return game;
            }
        }
        return null;
    }

    private mapRowToGame(row: GameRow): Game {
        const snapshot = this.sanitizeSnapshot(JSON.parse(row.snapshot));
        return Game.fromSnapshot(snapshot);
    }

    private sanitizeSnapshot(snapshot: any) {
        const defaults = Game.defaultConfig();
        const arenaWidth = snapshot?.config?.arenaWidth ?? defaults.arenaWidth;
        const arenaHeight = snapshot?.config?.arenaHeight ?? defaults.arenaHeight;
        const ballSpeed = resolveSpeed(snapshot?.config?.ballSpeed, defaults.ballSpeed);
        const paddleSpeed = resolveSpeed(snapshot?.config?.paddleSpeed, defaults.paddleSpeed);
        const paddleHeight = snapshot?.players?.[0]?.paddle?.height ?? 80;
        const paddleWidth = snapshot?.players?.[0]?.paddle?.width ?? 12;

        if (
            snapshot?.ball == null ||
            snapshot.ball.position == null ||
            typeof snapshot.ball.position.x !== 'number' ||
            typeof snapshot.ball.position.y !== 'number'
        ) {
            snapshot.ball = {
                position: { x: arenaWidth / 2, y: arenaHeight / 2 },
                velocity: { dx: ballSpeed, dy: ballSpeed }
            };
        }

        if (
            typeof snapshot.ball.velocity?.dx !== 'number' ||
            typeof snapshot.ball.velocity?.dy !== 'number'
        ) {
            snapshot.ball.velocity = { dx: ballSpeed, dy: ballSpeed };
        }

        snapshot.players = (snapshot.players ?? []).map((player: any, idx: number) => {
            const x = idx === 0 ? 24 : arenaWidth - 24 - paddleWidth;
            const y = (arenaHeight - paddleHeight) / 2;
            const pos = player?.paddle?.position ?? {};

            return {
                ...player,
                paddle: {
                    position: {
                        x: typeof pos.x === 'number' ? pos.x : x,
                        y: typeof pos.y === 'number' ? pos.y : y
                    },
                    height: player?.paddle?.height ?? paddleHeight,
                    width: player?.paddle?.width ?? paddleWidth
                },
                ready: player?.ready ?? false,
                isConnected: player?.isConnected ?? true
            };
        });

        snapshot.score = {
            player1: snapshot?.score?.player1 ?? 0,
            player2: snapshot?.score?.player2 ?? 0
        };

        snapshot.status = snapshot?.status ?? GameStatus.WAITING;

        snapshot.config = {
            arenaWidth,
            arenaHeight,
            scoreLimit: snapshot?.config?.scoreLimit ?? defaults.scoreLimit,
            paddleSpeed,
            ballSpeed
        };

        return snapshot;
    }
}
