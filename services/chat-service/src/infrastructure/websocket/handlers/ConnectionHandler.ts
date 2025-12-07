import { Socket } from 'socket.io';
import { logger } from '../../config';

export class ConnectionHandler {
    constructor(
        private readonly roomManager: any,
        private readonly authService: any
    ) {}

    register(socket: Socket): void {
        const userId = socket.data.userId;
        const username = socket.data.username;

        socket.join('global');
        socket.join(`user:${userId}`);

        this.roomManager.joinGlobalRoom(socket.id, userId);
        this.roomManager.joinUserRoom(socket.id, userId);

        socket.emit('connected', {
            userId,
            username,
            timestamp: new Date().toISOString()
        });

        logger.info(`User ${username} joined global and user rooms`);
    }
}
