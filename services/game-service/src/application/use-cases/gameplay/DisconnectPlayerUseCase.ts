import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GameNotFoundError } from '../../../domain/errors';
import { GameStatus } from '../../../domain/value-objects';

export class DisconnectPlayerUseCase {
    constructor(private readonly gameRepository: IGameRepository) {}

    async execute(gameId: string, playerId: string): Promise<void> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }

        if (game.status === GameStatus.WAITING) {
            // In the lobby phase we remove the player entirely so the roster updates
            game.removePlayer(playerId);
            if (game.players.length === 0) {
                game.cancel();
            }
        } else {
            // During play, only mark as disconnected so state/history are preserved
            game.disconnectPlayer(playerId);
        }

        await this.gameRepository.update(game);
    }
}
