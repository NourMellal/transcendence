import {GameNotFoundError} from '../../../domain/errors';
import {GameStatus} from '../../../domain/value-objects';
import {IGameRepository} from '../../ports/repositories/IGameRepository';

export class LeaveGameUseCase {
  constructor(private readonly gameRepository: IGameRepository) {
  }

  async execute(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    const isParticipant = game.players.some((player) => player.id === playerId);
    if (!isParticipant) {
      return;
    }

    if (game.status === GameStatus.WAITING) {
      game.removePlayer(playerId);
      if (game.players.length === 0) {
        game.cancel();
      }
    } else {
      game.disconnectPlayer(playerId);
    }

    await this.gameRepository.update(game);
  }
}
