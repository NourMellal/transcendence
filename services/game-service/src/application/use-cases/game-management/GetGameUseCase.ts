import { GameStateOutput } from '../../dto';
import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GameNotFoundError } from '../../../domain/errors';

export class GetGameUseCase {
    constructor(private readonly gameRepository: IGameRepository) {}

    async execute(gameId: string): Promise<GameStateOutput> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }

        return {
            id: game.id,
            status: game.status,
            mode: game.mode,
            players: game.players,
            score: { player1: game.score.player1, player2: game.score.player2 },
            createdAt: game.createdAt,
          updatedAt: game.updatedAt,
          startedAt: game.startedAt,
          finishedAt: game.finishedAt
        };
    }
}
