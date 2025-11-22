import { Socket } from 'socket.io';
import { DisconnectPlayerUseCase } from '../../../application/use-cases';
import { GameRoomManager } from '../GameRoomManager';
import { GameLoop } from '../GameLoop';

export class DisconnectHandler {
    constructor(
        private readonly disconnectPlayerUseCase: DisconnectPlayerUseCase,
        private readonly roomManager: GameRoomManager,
        private readonly gameLoop: GameLoop
    ) {}

    register(socket: Socket): void {
        socket.on('disconnecting', async () => {
            const rooms = [...socket.rooms].filter((room) => room !== socket.id);
            const playerId = socket.data.playerId as string | undefined;

            if (!playerId) {
                return;
            }

            await Promise.all(
                rooms.map(async (gameId) => {
                    await this.disconnectPlayerUseCase.execute(gameId, playerId);
                    this.roomManager.leave(gameId, playerId);
                    this.gameLoop.stop(gameId);
                })
            );
        });
    }
}
