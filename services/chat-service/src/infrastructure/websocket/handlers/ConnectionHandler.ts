import { Socket } from 'socket.io';
import { createLogger } from '@transcendence/shared-logging';
import { IGameChatPolicy } from '../../../application/use-cases/sendMessageUseCase';

const logger = createLogger('ConnectionHandler');

export class ConnectionHandler {
    constructor(
        private readonly roomManager: any,
        private readonly gameChatPolicy: IGameChatPolicy
    ) {}

    register(socket: Socket): void {
        const userId = socket.data.userId;
        const username = socket.data.username;

        socket.join(`user:${userId}`);
        this.roomManager.joinUserRoom(socket.id, userId);

        socket.emit('connected', {
            userId,
            username,
            timestamp: new Date().toISOString()
        });

        socket.on('join_game_chat', async (data) => {
            try {
                const gameId = data?.gameId;
                if (!gameId || typeof gameId !== 'string') {
                    throw new Error('gameId is required');
                }

                await this.gameChatPolicy.ensureCanChatInGame(gameId, userId);
                socket.join(`game:${gameId}`);
                this.roomManager.joinGameRoom(socket.id, userId, gameId);
                socket.emit('joined_game_chat', { gameId });
            } catch (error) {
                const err = error as Error;
                socket.emit('message_error', { error: err.message });
            }
        });

        socket.on('typing', async (data) => {
            try {
                const gameId = data?.gameId;
                const recipientId = data?.recipientId;

                if (gameId) {
                    await this.gameChatPolicy.ensureCanChatInGame(gameId, userId);
                    this.roomManager.joinGameRoom(socket.id, userId, gameId);
                    socket.to(`game:${gameId}`).emit('user_typing', { userId, username });
                } else if (recipientId) {
                    socket.to(`user:${recipientId}`).emit('user_typing', { userId, username });
                }
            } catch (error) {
                const err = error as Error;
                socket.emit('message_error', { error: err.message });
            }
        });

        logger.info(`User ${username} joined user room`);
    }
}
