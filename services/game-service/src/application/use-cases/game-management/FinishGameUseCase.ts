import { GameNotFoundError, InvalidGameStateError } from '../../../domain/errors';
import { GameStatus } from '../../../domain/value-objects';
import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';

export interface FinishGameInput {
    readonly gameId: string;
    readonly winnerId: string;
    readonly finishedAt?: Date;
}

export class FinishGameUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly eventPublisher: IGameEventPublisher
    ) {}

    async execute(input: FinishGameInput): Promise<void> {
        const game = await this.gameRepository.findById(input.gameId);
        if (!game) {
            throw new GameNotFoundError(input.gameId);
        }

        if (game.status === GameStatus.FINISHED) {
            return;
        }

        const winner = game.players.find((player) => player.id === input.winnerId);
        if (!winner) {
            throw new InvalidGameStateError('Winner is not part of this game');
        }

        game.finish();
        await this.gameRepository.update(game);
        await this.eventPublisher.publishGameFinished(game);
    }
}
