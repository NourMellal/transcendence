import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GamePhysics } from '../../../domain/services';
import { GameStatus } from '../../../domain/value-objects';
import { GameNotFoundError } from '../../../domain/errors';

export class UpdateGameStateUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly gamePhysics: GamePhysics
    ) {}

    async execute(gameId: string, deltaTime: number): Promise<void> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }

        if (game.status !== GameStatus.IN_PROGRESS) {
            return;
        }

        this.gamePhysics.advance(game, deltaTime);
        await this.gameRepository.update(game);
    }
}
