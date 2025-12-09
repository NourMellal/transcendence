import { Socket, Server as SocketIOServer } from 'socket.io';
import { SendMessageUseCase } from '../../../application/use-cases/sendMessageUseCase';
import { logger } from '../../config';

export class SendMessageHandler {
    private io: SocketIOServer | null = null;

    constructor(private readonly sendMessageUseCase: SendMessageUseCase) {}

    setServer(io: SocketIOServer): void {
        this.io = io;
    }

    register(socket: Socket): void {
        socket.on('send_message', async (data) => {
            try {
                const userId = socket.data.userId;
                const username = socket.data.username;

                const result = await this.sendMessageUseCase.execute({
                    senderId: userId,
                    senderUsername: username,
                    content: data.content,
                    type: data.type,
                    recipientId: data.recipientId,
                    gameId: data.gameId
                });

                // Broadcast to appropriate rooms
                if (this.io) {
                    const messagePayload = {
                        id: result.id,
                        senderId: result.senderId,
                        senderUsername: result.senderUsername,
                        content: result.content,
                        type: result.type,
                        recipientId: result.recipientId,
                        gameId: result.gameId,
                        createdAt: result.createdAt
                    };

                    if (result.type === 'GLOBAL') {
                        this.io.to('global').emit('new_message', messagePayload);
                    } else if (result.type === 'PRIVATE' && result.recipientId) {
                        this.io.to(`user:${result.senderId}`).emit('new_message', messagePayload);
                        this.io.to(`user:${result.recipientId}`).emit('new_message', messagePayload);
                    } else if (result.type === 'GAME' && result.gameId) {
                        this.io.to(`game:${result.gameId}`).emit('new_message', messagePayload);
                    }
                }

                socket.emit('message_sent', { success: true, message: result });
            } catch (error) {
                const err = error as Error;
                logger.error(`Failed to send message: ${err.message}`);
                socket.emit('message_error', { error: err.message });
            }
        });
    }
}
