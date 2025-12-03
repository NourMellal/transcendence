import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GamePhysics } from '../../../domain/services';
import { GameStatus } from '../../../domain/value-objects';
import { GameNotFoundError } from '../../../domain/errors';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';
import { IGameStateBroadcaster } from '../../ports/broadcasting/IGameStateBroadcaster';
import type { GameSnapshot } from '../../../domain/entities/Game';

interface UpdateGameStateResult {
    status: GameStatus;
}

export class UpdateGameStateUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly gamePhysics: GamePhysics,
        private readonly eventPublisher: IGameEventPublisher,
        private gameStateBroadcaster?: IGameStateBroadcaster
    ) {}

    setBroadcaster(broadcaster: IGameStateBroadcaster): void {
        this.gameStateBroadcaster = broadcaster;
    }

    async execute(gameId: string, deltaTime: number): Promise<UpdateGameStateResult> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }

        const statusBeforeTick = game.status;
        if (statusBeforeTick !== GameStatus.IN_PROGRESS) {
            const snapshot = game.toSnapshot();
            this.gameStateBroadcaster?.broadcastGameState(gameId, toWireGameState(snapshot));
            return { status: statusBeforeTick };
        }

        const finishedDuringTick = this.gamePhysics.advance(game, deltaTime);
        await this.gameRepository.update(game);

        if (finishedDuringTick && game.status === GameStatus.FINISHED) {
            await this.eventPublisher.publishGameFinished(game);
        }

        const snapshot = game.toSnapshot();
        this.gameStateBroadcaster?.broadcastGameState(gameId, toWireGameState(snapshot));

        return { status: game.status };
    }
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
function toWireGameState(snapshot: GameSnapshot): Record<string, unknown> {
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
