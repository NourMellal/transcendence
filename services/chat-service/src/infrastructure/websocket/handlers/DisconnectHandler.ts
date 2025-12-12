import { Socket } from 'socket.io';
import { logger } from '../../config';
import { RoomManager } from '../RoomManager';

export class DisconnectHandler {
    constructor(private readonly roomManager: RoomManager) {}

    register(socket: Socket): void {
        socket.on('disconnect', () => {
            const userId = socket.data.userId;
            const username = socket.data.username;

            this.roomManager.leaveAllRooms(userId);
            logger.info(`👋 User disconnected: ${username} (${userId})`);
        });
    }
}
