import { Game } from '../../../domain/entities';
import { InvalidGameStateError } from '../../../domain/errors';
import { CreateGameInput, CreateGameOutput } from '../../dto';
import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';
import { IUserServiceClient } from '../../ports/external/IUserServiceClient';

export class CreateGameUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly eventPublisher: IGameEventPublisher,
        private readonly userServiceClient: IUserServiceClient
    ) {}

    async execute(input: CreateGameInput): Promise<CreateGameOutput> {
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
            players: game.players.map((player) => ({ id: player.id, isConnected: player.isConnected })),
            createdAt: game.createdAt
        };
    }
}
