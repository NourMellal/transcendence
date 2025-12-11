import { Socket } from 'socket.io';
import { GameLoop } from '../GameLoop';
import { GameRoomManager } from '../GameRoomManager';
import { JoinGameUseCase, ReadyUpUseCase, DisconnectPlayerUseCase } from '../../../application/use-cases';
import { IGameRepository } from '../../../application/ports/repositories/IGameRepository';
import { toWireGameState } from '../../../application/use-cases/gameplay/UpdateGameStateUseCase';
import { GameStatus } from '../../../domain/value-objects';

interface JoinGamePayload {
    readonly gameId?: string;
}

interface ReadyPayload {
    readonly gameId?: string;
}

export class ConnectionHandler {
    constructor(
        private readonly roomManager: GameRoomManager,
        private readonly gameLoop: GameLoop,
        private readonly joinGameUseCase: JoinGameUseCase,
        private readonly readyUpUseCase: ReadyUpUseCase,
        private readonly gameRepository: IGameRepository,
        private readonly disconnectPlayerUseCase: DisconnectPlayerUseCase
    ) {}

    register(socket: Socket): void {
        socket.on('join_game', async (payload: JoinGamePayload) => {
            const playerId = socket.data.playerId as string | undefined;
            const gameId = payload?.gameId;

            if (!playerId || !gameId) {
                socket.emit('error', { message: 'Missing gameId or authenticated player' });
                return;
            }

            // Cancel any pending removal for this player (reconnection within grace period)
            await this.disconnectPlayerUseCase.cancelRemovalIfPending(gameId, playerId);

            this.roomManager.join(gameId, playerId, socket);
            try {
                await this.joinGameUseCase.execute(gameId, playerId);
                const game = await this.gameRepository.findById(gameId);
                if (game) {
                    this.roomManager.emitToGame(gameId, 'game_state', toWireGameState(game.toSnapshot()));
                    if (game.status === GameStatus.IN_PROGRESS) {
                        this.gameLoop.start(gameId);
                        socket.nsp.to(gameId).emit('game_start', { gameId });
                    }
                }
            } catch (error) {
                socket.emit('error', { message: (error as Error).message });
            }
        });

        socket.on('ready', async (payload?: ReadyPayload) => {
            const playerId = socket.data.playerId as string | undefined;
            const gameId = payload?.gameId ?? this.getActiveGameId(socket);

            if (!playerId || !gameId) {
                socket.emit('error', { message: 'Missing gameId or authenticated player' });
                return;
            }

            try {
                const { started, alreadyReady } = await this.readyUpUseCase.execute(gameId, playerId);
                if (!alreadyReady) {
                    this.roomManager.emitToGame(gameId, 'player_ready', { playerId });
                }
                if (started) {
                    this.gameLoop.start(gameId);
                    socket.nsp.to(gameId).emit('game_start', { gameId });
                }
            } catch (error) {
                socket.emit('error', { message: (error as Error).message });
            }
        });
    }

    private getActiveGameId(socket: Socket): string | undefined {
        return [...socket.rooms].find((room) => room !== socket.id);
    }
}
