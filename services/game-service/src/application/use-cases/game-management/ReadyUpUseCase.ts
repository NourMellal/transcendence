import { GameStatus } from '../../../domain/value-objects';
import { GameNotFoundError, InvalidGameStateError } from '../../../domain/errors';
import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';

export class ReadyUpUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly eventPublisher: IGameEventPublisher
    ) {}

    async execute(gameId: string, playerId: string): Promise<{ started: boolean }> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }

        const isParticipant = game.players.some((player) => player.id === playerId);
        if (!isParticipant) {
            throw new InvalidGameStateError('Player is not part of this game');
        }

        const everyoneReady = game.markPlayerReady(playerId);

        if (everyoneReady && game.status === GameStatus.WAITING) {
            game.start();
        }

        await this.gameRepository.update(game);

        let started = false;
        if (everyoneReady && game.status === GameStatus.IN_PROGRESS) {
            await this.eventPublisher.publishGameStarted(game);
            started = true;
        }

        return { started };
    }
}
