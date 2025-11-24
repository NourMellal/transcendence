import {GameNotFoundError, InvalidGameStateError} from '../../../domain/errors';
import {GameStatus} from '../../../domain/value-objects';
import {IGameRepository} from '../../ports/repositories/IGameRepository';

export class JoinGameUseCase {
  constructor(private readonly gameRepository: IGameRepository) {
  }

  async execute(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    if (game.players.some((player) => player.id === playerId)) {
      return;
    }

    if (game.status !== GameStatus.WAITING) {
      throw new InvalidGameStateError('Game is not accepting new players');
    }

    if (game.players.length >= 2) {
      throw new InvalidGameStateError('Game is already full');
    }

    game.addOpponent(playerId);
    await this.gameRepository.update(game);
  }
}
