import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { IGameEventPublisher } from '../../ports/messaging/IGameEventPublisher';
import { IGameStateBroadcaster } from '../../ports/broadcasting/IGameStateBroadcaster';
import { GameStatus, Score } from '../../../domain/value-objects';
import { toWireGameState } from '../gameplay/UpdateGameStateUseCase';

export class ForfeitGameUseCase {
    private broadcaster?: IGameStateBroadcaster;

    constructor(
        private readonly gameRepository: IGameRepository,
        private readonly eventPublisher: IGameEventPublisher,
        broadcaster?: IGameStateBroadcaster
    ) {
        this.broadcaster = broadcaster;
    }

    setBroadcaster(broadcaster: IGameStateBroadcaster): void {
        this.broadcaster = broadcaster;
    }

    async execute(gameId: string): Promise<boolean> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            return false;
        }

        if (game.status !== GameStatus.WAITING) {
            return false;
        }

        if (game.players.length < 2) {
            return false;
        }

        const readyPlayers = game.players.filter((player) => player.ready);
        if (readyPlayers.length >= 2) {
            return false;
        }

        const winnerId =
            readyPlayers.length === 1 ? readyPlayers[0].id : game.players[0]?.id;

        if (!winnerId) {
            return false;
        }

        const player1Id = game.players[0]?.id;
        const player2Id = game.players[1]?.id;
        const scoreLimit = game.config.scoreLimit ?? 11;
        const player1Score = winnerId === player1Id ? scoreLimit : 0;
        const player2Score = winnerId === player2Id ? scoreLimit : 0;

        game.updateScore(Score.create(player1Score, player2Score));
        game.finish();

        await this.gameRepository.update(game);
        await this.eventPublisher.publishGameFinished(game);

        if (this.broadcaster?.broadcastGameFinished) {
            this.broadcaster.broadcastGameFinished(game.id, {
                gameId: game.id,
                winnerId,
                finalScore: { left: player1Score, right: player2Score },
                finishedAt: game.finishedAt?.toISOString()
            });
        }

        if (this.broadcaster?.broadcastGameState) {
            this.broadcaster.broadcastGameState(game.id, toWireGameState(game.toSnapshot()));
        }

        return true;
    }
}
