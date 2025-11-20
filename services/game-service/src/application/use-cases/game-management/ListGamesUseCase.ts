import { GameStateOutput } from '../../dto';
import { IGameRepository, ListGamesParams } from '../../ports/repositories/IGameRepository';

export class ListGamesUseCase {
    constructor(private readonly gameRepository: IGameRepository) {}

    async execute(params?: ListGamesParams): Promise<GameStateOutput[]> {
        const games = await this.gameRepository.list(params);
        return games.map((game) => ({
            id: game.id,
            status: game.status,
            mode: game.mode,
            players: game.players,
            score: { player1: game.score.player1, player2: game.score.player2 },
            createdAt: game.createdAt,
            updatedAt: game.updatedAt
        }));
    }
}
