import { Socket } from 'socket.io';
import { GameLoop } from '../GameLoop';
import { GameRoomManager } from '../GameRoomManager';
import { JoinGameUseCase, ReadyUpUseCase } from '../../../application/use-cases';

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
        private readonly readyUpUseCase: ReadyUpUseCase
    ) {}

    register(socket: Socket): void {
        socket.on('join_game', async (payload: JoinGamePayload) => {
            const playerId = socket.data.playerId as string | undefined;
            const gameId = payload?.gameId;

            if (!playerId || !gameId) {
                socket.emit('error', { message: 'Missing gameId or authenticated player' });
                return;
            }

            this.roomManager.join(gameId, playerId, socket);
            try {
                await this.joinGameUseCase.execute(gameId, playerId);
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
                const { started } = await this.readyUpUseCase.execute(gameId, playerId);
                this.roomManager.emitToGame(gameId, 'player_ready', { playerId });
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
