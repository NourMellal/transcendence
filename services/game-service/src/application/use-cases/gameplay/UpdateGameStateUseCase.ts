import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GamePhysics } from '../../../domain/services';
import { GameStatus } from '../../../domain/value-objects';
import { GameNotFoundError } from '../../../domain/errors';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';
import { IGameStateBroadcaster } from '../../ports/broadcasting/IGameStateBroadcaster';
import { IUserServiceClient } from '../../ports/external';
import type { GameSnapshot } from '../../../domain/entities/Game';
import { Ball, Paddle } from '../../../domain/entities';
import { Position, Velocity } from '../../../domain/value-objects';

interface UpdateGameStateResult {
    status: GameStatus;
}

export class UpdateGameStateUseCase {
    private readonly cache = new Map<
        string,
        {
            game: import('../../../domain/entities').Game;
            ticksSincePersist: number;
            lastScore: { p1: number; p2: number };
            lastStatus: GameStatus;
        }
    >();
    private readonly persistEveryNTicks: number;

    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly gamePhysics: GamePhysics,
        private readonly eventPublisher: IGameEventPublisher,
        private gameStateBroadcaster?: IGameStateBroadcaster,
        private readonly userServiceClient?: IUserServiceClient,
        persistEveryNTicks = 10
    ) {
        this.persistEveryNTicks = Math.max(1, persistEveryNTicks);
    }

    setBroadcaster(broadcaster: IGameStateBroadcaster): void {
        this.gameStateBroadcaster = broadcaster;
    }

    /**
     * Apply an external mutation (e.g., paddle_set) while keeping the cache in sync.
     */
    async applyExternalUpdate(
        gameId: string,
        mutator: (game: import('../../../domain/entities').Game) => void
    ): Promise<GameSnapshot> {
        const entry = await this.loadCachedGame(gameId);
        mutator(entry.game);
        await this.persist(gameId, entry);
        return entry.game.toSnapshot();
    }

    async execute(gameId: string, deltaTime: number): Promise<UpdateGameStateResult> {
        const entry = await this.loadCachedGame(gameId);
        const game = entry.game;

        // If ball or paddles are missing/invalid, reset them to sane defaults
        const rehydrated = rehydrateIfCorrupt(game);

        const statusBeforeTick = game.status;
        if (statusBeforeTick !== GameStatus.IN_PROGRESS) {
            const snapshot = game.toSnapshot();
            this.broadcastGameState(gameId, snapshot);
            if (rehydrated) {
                await this.persist(gameId, entry);
            }
            return { status: statusBeforeTick };
        }

        const finishedDuringTick = this.gamePhysics.advance(game, deltaTime);
        entry.ticksSincePersist += 1;

        const snapshot = game.toSnapshot();
        if (finishedDuringTick && game.status === GameStatus.FINISHED) {
            await this.eventPublisher.publishGameFinished(game);
            await this.broadcastGameFinished(gameId, snapshot);
        }
        const scoreChanged =
            snapshot.score.player1 !== entry.lastScore.p1 || snapshot.score.player2 !== entry.lastScore.p2;
        const statusChanged = snapshot.status !== entry.lastStatus;

        // Always broadcast ball position/velocity at tick rate (authoritative)
        this.broadcastBallState(gameId, snapshot);

        // Broadcast full state only when scoreboard/status changes or on finish
        if (scoreChanged || statusChanged || finishedDuringTick) {
            this.broadcastGameState(gameId, snapshot);
            entry.lastScore = { p1: snapshot.score.player1, p2: snapshot.score.player2 };
            entry.lastStatus = snapshot.status;
        }

        if (
            rehydrated ||
            entry.ticksSincePersist >= this.persistEveryNTicks ||
            scoreChanged ||
            game.status !== GameStatus.IN_PROGRESS
        ) {
            await this.persist(gameId, entry);
        }

        if (game.status === GameStatus.FINISHED || game.status === GameStatus.CANCELLED) {
            this.cache.delete(gameId);
        }

        return { status: game.status };
    }

    private async broadcastGameFinished(gameId: string, snapshot: GameSnapshot): Promise<void> {
        if (!this.gameStateBroadcaster?.broadcastGameFinished) {
            return;
        }

        const winnerId = this.resolveWinnerId(snapshot);
        let winnerUsername: string | undefined;

        if (winnerId && this.userServiceClient) {
            try {
                const summary = await this.userServiceClient.getUserSummary(winnerId);
                winnerUsername = summary?.username;
            } catch (error) {
                console.warn('[UpdateGameStateUseCase] Failed to fetch winner username', error);
            }
        }

        const payload = {
            gameId,
            winnerId,
            winnerUsername,
            finalScore: {
                left: snapshot.score.player1,
                right: snapshot.score.player2
            },
            finishedAt: snapshot.finishedAt ?? new Date().toISOString()
        };

        this.gameStateBroadcaster.broadcastGameFinished(gameId, payload);
    }

    private resolveWinnerId(snapshot: GameSnapshot): string | null {
        if (snapshot.score.player1 === snapshot.score.player2) {
            return null;
        }

        return snapshot.score.player1 > snapshot.score.player2
            ? snapshot.players[0]?.id ?? null
            : snapshot.players[1]?.id ?? null;
    }

    private async loadCachedGame(gameId: string) {
        const cached = this.cache.get(gameId);
        if (cached) return cached;

        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }
        const snap = game.toSnapshot();
        const entry = {
            game,
            ticksSincePersist: 0,
            lastScore: { p1: snap.score.player1, p2: snap.score.player2 },
            lastStatus: snap.status
        };
        this.cache.set(gameId, entry);
        return entry;
    }

    private async persist(gameId: string, entry: { game: import('../../../domain/entities').Game; ticksSincePersist: number }) {
        await this.gameRepository.update(entry.game);
        entry.ticksSincePersist = 0;
        if (entry.game.status === GameStatus.FINISHED || entry.game.status === GameStatus.CANCELLED) {
            this.cache.delete(gameId);
        }
    }

    private broadcastBallState(gameId: string, snapshot: GameSnapshot): void {
        const payload = toWireBallState(snapshot);
        if (this.gameStateBroadcaster?.broadcastBallState) {
            this.gameStateBroadcaster.broadcastBallState(gameId, payload);
        } else {
            this.gameStateBroadcaster?.broadcastGameState(gameId, payload);
        }
    }

    private broadcastGameState(gameId: string, snapshot: GameSnapshot): void {
        const payload = toWireGameState(snapshot);
        this.gameStateBroadcaster?.broadcastGameState(gameId, payload);
    }
}

export function toWireBallState(snapshot: GameSnapshot): Record<string, unknown> {
    return {
        gameId: snapshot.id,
        status: snapshot.status,
        ball: {
            x: snapshot.ball.position.x,
            y: snapshot.ball.position.y,
            vx: snapshot.ball.velocity.dx,
            vy: snapshot.ball.velocity.dy
        }
    };
}

/**
 * Normalize domain snapshot into the documented websocket payload:
 * {
 *   gameId,
 *   ball: { x, y, vx, vy },
 *   paddles: { left: { y }, right: { y } },
 *   score: { player1, player2 },
 *   status
 * }
 */
export function toWireGameState(snapshot: GameSnapshot): Record<string, unknown> {
    const left = snapshot.players[0];
    const right = snapshot.players[1];

    return {
        gameId: snapshot.id,
        status: snapshot.status,
        ball: {
            x: snapshot.ball.position.x,
            y: snapshot.ball.position.y,
            vx: snapshot.ball.velocity.dx,
            vy: snapshot.ball.velocity.dy
        },
        paddles: {
            left: { y: left?.paddle.position.y ?? 0 },
            right: { y: right?.paddle.position.y ?? 0 }
        },
        score: {
            player1: snapshot.score.player1,
            player2: snapshot.score.player2
        }
    };
}

function rehydrateIfCorrupt(game: import('../../../domain/entities').Game): boolean {
    const snap = game.toSnapshot();
    const { arenaWidth, arenaHeight, ballSpeed } = snap.config;
    let changed = false;

    const needsBallReset =
        snap.ball.position.x === null ||
        snap.ball.position.y === null ||
        Number.isNaN(snap.ball.position.x) ||
        Number.isNaN(snap.ball.position.y);

    const needsPaddleReset =
        snap.players.some((p) => p.paddle.position.y === null || Number.isNaN(p.paddle.position.y));

    if (needsBallReset) {
        const centerX = arenaWidth / 2;
        const centerY = arenaHeight / 2;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const resetVelocity = { dx: ballSpeed * direction, dy: ballSpeed };
        game.updateBall(
            Ball.create(Position.create(centerX, centerY), Velocity.create(resetVelocity.dx, resetVelocity.dy))
        );
        changed = true;
    }

    if (needsPaddleReset) {
        const paddleHeight = snap.players[0]?.paddle.height ?? 80;
        const paddleWidth = snap.players[0]?.paddle.width ?? 12;

        snap.players.forEach((player, idx) => {
            if (player.paddle.position.y === null || Number.isNaN(player.paddle.position.y)) {
                const x = idx === 0 ? 24 : arenaWidth - 24 - paddleWidth;
                const y = (arenaHeight - paddleHeight) / 2;
                game.players[idx].paddle = Paddle.create(Position.create(x, y), paddleHeight, paddleWidth);
                changed = true;
            }
        });
    }

    return changed;
}
