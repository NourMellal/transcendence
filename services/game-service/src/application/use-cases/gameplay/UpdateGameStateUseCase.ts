import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GamePhysics } from '../../../domain/services';
import { GameStatus } from '../../../domain/value-objects';
import { GameNotFoundError } from '../../../domain/errors';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';
import { IGameStateBroadcaster } from '../../ports/broadcasting/IGameStateBroadcaster';

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

        if (game.status !== GameStatus.IN_PROGRESS) {
            const snapshot = game.toSnapshot();
            this.gameStateBroadcaster?.broadcastGameState(gameId, snapshot);
            return { status: game.status };
        }

        const finishedDuringTick = this.gamePhysics.advance(game, deltaTime);
        await this.gameRepository.update(game);

        if (finishedDuringTick && game.status === GameStatus.FINISHED) {
            await this.eventPublisher.publishGameFinished(game);
        }

        const snapshot = game.toSnapshot();
        this.gameStateBroadcaster?.broadcastGameState(gameId, snapshot);

        return { status: game.status };
    }
}
