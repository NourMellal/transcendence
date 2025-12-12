import { Socket, Server as SocketIOServer } from 'socket.io';
import { logger } from '../../config';
import { IGameChatPolicy } from '../../../application/use-cases/sendMessageUseCase';
import { RoomManager } from '../RoomManager';

export class TypingHandler {
    private io: SocketIOServer | null = null;

    constructor(
        private readonly gameChatPolicy?: IGameChatPolicy,
        private readonly roomManager?: RoomManager
    ) {}

    setServer(io: SocketIOServer): void {
        this.io = io;
    }

    register(socket: Socket): void {
        socket.on('typing', async (data) => {
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

                // Handle game chat typing (with policy check)
                if (data.gameId) {
                    if (this.gameChatPolicy) {
                        await this.gameChatPolicy.ensureCanChatInGame(data.gameId, userId);
                    }

                    if (this.roomManager) {
                        this.roomManager.joinGameRoom(socket.id, userId, data.gameId);
                    }

                    socket.join(`game:${data.gameId}`);
                    socket.to(`game:${data.gameId}`).emit('user_typing', {
                        userId,
                        username,
                        gameId: data.gameId
                    });
                }
            } catch (error) {
                const err = error as Error;
                logger.error(`Failed to handle typing event: ${err.message}`);
                socket.emit('message_error', { error: err.message });
            }
        });
    }
}
