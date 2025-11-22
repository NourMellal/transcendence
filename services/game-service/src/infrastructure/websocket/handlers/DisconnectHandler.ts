import { Socket } from 'socket.io';
import { DisconnectPlayerUseCase } from '../../../application/use-cases';
import { GameRoomManager } from '../GameRoomManager';

export class DisconnectHandler {
    constructor(
        private readonly disconnectPlayerUseCase: DisconnectPlayerUseCase,
        private readonly roomManager: GameRoomManager
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
                })
            );
        });
    }
}
