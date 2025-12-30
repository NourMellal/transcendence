import { Game } from '../../../domain/entities';
import { InvalidGameStateError } from '../../../domain/errors';
import {CreateGameInput, GameStateOutput} from '../../dto';
import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';
import { IUserServiceClient } from '../../ports/external/IUserServiceClient';
import { IGameReadyTimeoutScheduler } from '../../ports/timeouts';
import { GameStatus } from '../../../domain/value-objects';

export class CreateGameUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly eventPublisher: IGameEventPublisher,
        private readonly userServiceClient: IUserServiceClient,
        private readonly readyTimeoutScheduler?: IGameReadyTimeoutScheduler
    ) {}

  async execute(input: CreateGameInput): Promise<GameStateOutput> {
        await this.userServiceClient.ensureUsersExist(
            [input.playerId, input.opponentId].filter(Boolean) as string[]
        );

        const existingGame = await this.gameRepository.findActiveByPlayer(input.playerId);
        if (existingGame) {
            // If player is in a WAITING lobby, automatically leave it to create/join new game
            if (existingGame.status === GameStatus.WAITING) {
                existingGame.removePlayer(input.playerId);
                if (existingGame.players.length === 0) {
                    existingGame.cancel();
                }
                await this.gameRepository.update(existingGame);
            } else {
                // If player is in an active game (IN_PROGRESS), they can't create a new one
                throw new InvalidGameStateError('Player already has an active game');
            }
        }

        if (input.opponentId) {
            const opponentGame = await this.gameRepository.findActiveByPlayer(input.opponentId);
            if (opponentGame) {
                // If opponent is in a WAITING lobby, automatically remove them to accept this invite
                if (opponentGame.status === GameStatus.WAITING) {
                    opponentGame.removePlayer(input.opponentId);
                    if (opponentGame.players.length === 0) {
                        opponentGame.cancel();
                    }
                    await this.gameRepository.update(opponentGame);
                } else {
                    // If opponent is in an active game (IN_PROGRESS), they can't accept the invite
                    throw new InvalidGameStateError('Opponent is currently in an active game');
                }
            }
        }

        const game = Game.create({
            playerId: input.playerId,
            opponentId: input.opponentId,
            mode: input.mode,
            tournamentId: input.tournamentId,
            matchId: input.matchId,
            config: input.config ?? {}
        });

        await this.gameRepository.create(game);
        await this.eventPublisher.publishGameCreated(game);
        if (game.mode === 'TOURNAMENT' && game.players.length >= 2) {
            this.readyTimeoutScheduler?.schedule(game.id);
        }

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
