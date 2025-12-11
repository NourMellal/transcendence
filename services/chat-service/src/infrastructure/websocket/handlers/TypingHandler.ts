import { Socket, Server as SocketIOServer } from 'socket.io';
import { logger } from '../../config';

export class TypingHandler {
    private io: SocketIOServer | null = null;

    setServer(io: SocketIOServer): void {
        this.io = io;
    }

    register(socket: Socket): void {
        socket.on('typing', (data) => {
            try {
                const userId = socket.data.userId;
                const username = socket.data.username;

                if (!this.io) {
                    return;
                }

                // Handle direct message typing
                if (data.recipientId) {
                    logger.debug(`User ${username} is typing to ${data.recipientId}`);
                    this.io.to(`user:${data.recipientId}`).emit('user_typing', {
                        userId,
                        username,
                        recipientId: data.recipientId
                    });
                }

                // Handle game chat typing
                if (data.gameId) {
                    logger.debug(`User ${username} is typing in game ${data.gameId}`);
                    socket.to(`game:${data.gameId}`).emit('user_typing', {
                        userId,
                        username,
                        gameId: data.gameId
                    });
                }
            } catch (error) {
                const err = error as Error;
                logger.error(`Failed to handle typing event: ${err.message}`);
            }
        });
    }
}
