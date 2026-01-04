import { Socket } from 'socket.io';
import { SendMessageUseCase } from '../../../application/use-cases/sendMessageUseCase';
import { createLogger } from '@transcendence/shared-logging';
import { MessageType } from '../../../domain/value-objects/messageType';

const logger = createLogger('SendMessageHandler');

export class SendMessageHandler {
    constructor(private readonly sendMessageUseCase: SendMessageUseCase) {}

    register(socket: Socket): void {
        socket.on('send_message', async (data) => {
            try {
                const userId = socket.data.userId;
                const username = socket.data.username;
                const type = String(data.type).toUpperCase() as MessageType;

                const result = await this.sendMessageUseCase.execute({
                    senderId: userId,
                    senderUsername: username,
                    content: data.content,
                    type: type,
                    recipientId: data.recipientId,
                    gameId: data.gameId,
                    invitePayload: data.invitePayload
                });

                // Only acknowledge to sender - broadcasting is handled by EventBus
                socket.emit('message_sent', { success: true, message: result });
            } catch (error) {
                const err = error as Error;
                logger.error({ error: err.message }, 'Failed to send message');
                socket.emit('message_error', { error: err.message });
            }
        });
    }
}
