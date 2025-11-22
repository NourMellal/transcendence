import { PaddleMoveInput } from '../../dto';
import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GamePhysics } from '../../../domain/services';
import { GameNotFoundError } from '../../../domain/errors';
import { GameStatus } from '../../../domain/value-objects';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';

export class HandlePaddleMoveUseCase {
    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly gamePhysics: GamePhysics,
        private readonly eventPublisher: IGameEventPublisher
    ) {}

    async execute(input: PaddleMoveInput): Promise<void> {
        const game = await this.gameRepository.findById(input.gameId);
        if (!game) {
            throw new GameNotFoundError(input.gameId);
        }

        if (game.status !== GameStatus.IN_PROGRESS) {
            return;
        }

        game.movePaddle(input.playerId, input.direction, input.deltaTime);
        const finishedDuringAdvance = this.gamePhysics.advance(game, input.deltaTime);
        await this.gameRepository.update(game);

        if (finishedDuringAdvance && game.status === GameStatus.FINISHED) {
            await this.eventPublisher.publishGameFinished(game);
        }
    }
}
