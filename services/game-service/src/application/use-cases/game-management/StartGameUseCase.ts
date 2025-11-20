import { GameStatus } from '../../../domain/value-objects';
import { GameNotFoundError, InvalidGameStateError } from '../../../domain/errors';
import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';

export class StartGameUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly eventPublisher: IGameEventPublisher
    ) {}

    async execute(gameId: string): Promise<void> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }

        if (game.status !== GameStatus.WAITING) {
            throw new InvalidGameStateError('Game already started');
        }

        if (game.players.length < 2) {
            throw new InvalidGameStateError('Game still waiting for opponent');
        }

        game.start();
        await this.gameRepository.update(game);
        await this.eventPublisher.publishGameStarted(game);
    }
}
