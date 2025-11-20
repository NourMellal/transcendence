import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GameNotFoundError } from '../../../domain/errors';

export class DisconnectPlayerUseCase {
    constructor(private readonly gameRepository: IGameRepository) {}

    async execute(gameId: string, playerId: string): Promise<void> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }

        game.disconnectPlayer(playerId);
        await this.gameRepository.update(game);
    }
}
