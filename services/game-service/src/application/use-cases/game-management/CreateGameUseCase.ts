import { Game } from '../../../domain/entities';
import { InvalidGameStateError } from '../../../domain/errors';
import {CreateGameInput, GameStateOutput} from '../../dto';
import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';
import { IUserServiceClient } from '../../ports/external/IUserServiceClient';

export class CreateGameUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly eventPublisher: IGameEventPublisher,
        private readonly userServiceClient: IUserServiceClient
    ) {}

  async execute(input: CreateGameInput): Promise<GameStateOutput> {
        await this.userServiceClient.ensureUsersExist(
            [input.playerId, input.opponentId].filter(Boolean) as string[]
        );

        const existingGame = await this.gameRepository.findActiveByPlayer(input.playerId);
        if (existingGame) {
            throw new InvalidGameStateError('Player already has an active game');
        }

        if (input.opponentId) {
            const opponentGame = await this.gameRepository.findActiveByPlayer(input.opponentId);
            if (opponentGame) {
                throw new InvalidGameStateError('Opponent already has an active game');
            }
        }

        const game = Game.create({
            playerId: input.playerId,
            opponentId: input.opponentId,
            mode: input.mode,
            tournamentId: input.tournamentId,
            config: input.config ?? {}
        });

        await this.gameRepository.create(game);
        await this.eventPublisher.publishGameCreated(game);

        return {
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
        };
    }
}
