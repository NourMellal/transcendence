import { Socket } from 'socket.io';
import { SendMessageUseCase } from '../../../application/use-cases/sendMessageUseCase';
import { logger } from '../../config';

export class SendMessageHandler {
    constructor(private readonly sendMessageUseCase: SendMessageUseCase) {}

    register(socket: Socket): void {
        socket.on('send_message', async (data) => {
            try {
                const userId = socket.data.userId;
                const username = socket.data.username;

                await this.sendMessageUseCase.execute({
                    senderId: userId,
                    senderUsername: username,
                    content: data.content,
                    type: data.type,
                    recipientId: data.recipientId,
                    gameId: data.gameId
                });

                socket.emit('message_sent', { success: true });
            } catch (error) {
                const err = error as Error;
                logger.error(`Failed to send message: ${err.message}`);
                socket.emit('message_error', { error: err.message });
            }
        });
    }
}
