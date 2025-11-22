import { Socket } from 'socket.io';
import { GameLoop } from '../GameLoop';
import { GameRoomManager, JoinPayload } from '../GameRoomManager';
import {JoinGameUseCase, StartGameUseCase} from '../../../application/use-cases';

export class ConnectionHandler {
    constructor(
        private readonly roomManager: GameRoomManager,
        private readonly gameLoop: GameLoop,
        private readonly joinGameUseCase: JoinGameUseCase,
        private readonly startGameUseCase: StartGameUseCase
    ) {}

    register(socket: Socket): void {
        socket.on('join-game', async (payload: JoinPayload) => {
            this.roomManager.join(payload, socket);
            try {
              await this.joinGameUseCase.execute(payload.gameId, payload.playerId);
                await this.startGameUseCase.execute(payload.gameId);
                this.gameLoop.start(payload.gameId);
            } catch (error) {
                socket.emit('error', { message: (error as Error).message });
            }
        });
    }
}
