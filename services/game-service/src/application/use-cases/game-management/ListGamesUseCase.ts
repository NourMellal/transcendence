import { GameStateOutput } from '../../dto';
import { IGameRepository, ListGamesParams } from '../../ports/repositories/IGameRepository';

export interface ListGamesResult {
  readonly games: GameStateOutput[];
  readonly total: number;
}

export class ListGamesUseCase {
    constructor(private readonly gameRepository: IGameRepository) {}

  async execute(params?: ListGamesParams): Promise<ListGamesResult> {
    const baseParams = params ? {...params, limit: undefined, offset: undefined} : undefined;
    const allGames = await this.gameRepository.list(baseParams);
    const paginatedGames = params?.limit || params?.offset ? await this.gameRepository.list(params) : allGames;

    return {
      games: paginatedGames.map((game) => ({
        id: game.id,
        status: game.status,
        mode: game.mode,
        players: game.players,
        score: {player1: game.score.player1, player2: game.score.player2},
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        config: game.config,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt
      })),
      total: allGames.length
    };
    }
}
