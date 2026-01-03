import { Socket } from 'socket.io';
import { RespondInviteUseCase } from '../../../application/use-cases/respond-invite.usecase';
import { createLogger } from '@transcendence/shared-logging';
import { InviteErrorCategorizer, InviteErrorType } from '../../../application/dto/invite-error.dto';

const logger = createLogger('InviteResponseHandler');

export class InviteResponseHandler {
    constructor(private readonly respondInviteUseCase: RespondInviteUseCase) {}

    register(socket: Socket): void {
        socket.on('accept_invite', async (data) => {
            try {
                const userId = socket.data.userId;
                const username = socket.data.username;
                const inviteId = data?.inviteId;

                if (!inviteId) {
                    socket.emit('invite_error', { 
                        error: 'inviteId is required',
                        errorType: InviteErrorType.INVALID_REQUEST
                    });
                    return;
                }

                const result = await this.respondInviteUseCase.accept({
                    inviteId,
                    responderId: userId,
                    responderUsername: username,
                });

                // Check if result contains an error (from error handler)
                if ((result as any).error) {
                    const errorType = InviteErrorCategorizer.categorize(
                        new Error((result as any).error)
                    );
                    
                    socket.emit('invite_error', { 
                        error: (result as any).error,
                        errorType,
                        inviteId 
                    });
                    return;
                }

                // Simple ACK - EventBus will broadcast invite_accepted to all clients
                socket.emit('command_ack', { 
                    command: 'accept_invite',
                    inviteId
                });
            } catch (error) {
                const err = error as Error;
                const errorType = InviteErrorCategorizer.categorize(err);
                
                logger.error({ error: err.message, errorType }, 'Failed to accept invite');
                
                socket.emit('invite_error', { 
                    error: err.message,
                    errorType,
                    inviteId: data?.inviteId 
                });
            }
        });

        socket.on('decline_invite', async (data) => {
            try {
                const userId = socket.data.userId;
                const username = socket.data.username;
                const inviteId = data?.inviteId;

                if (!inviteId) {
                    socket.emit('invite_error', { 
                        error: 'inviteId is required',
                        errorType: InviteErrorType.INVALID_REQUEST
                    });
                    return;
                }

                const result = await this.respondInviteUseCase.decline({
                    inviteId,
                    responderId: userId,
                    responderUsername: username,
                });

                // Check if result contains an error (from error handler)
                if ((result as any).error) {
                    const errorType = InviteErrorCategorizer.categorize(
                        new Error((result as any).error)
                    );
                    
                    socket.emit('invite_error', { 
                        error: (result as any).error,
                        errorType,
                        inviteId 
                    });
                    return;
                }

                // Simple ACK - EventBus will broadcast invite_declined to all clients
                socket.emit('command_ack', { 
                    command: 'decline_invite',
                    inviteId
                });
            } catch (error) {
                const err = error as Error;
                const errorType = InviteErrorCategorizer.categorize(err);
                
                logger.error({ error: err.message, errorType }, 'Failed to decline invite');
                
                socket.emit('invite_error', { 
                    error: err.message,
                    errorType,
                    inviteId: data?.inviteId
                });
            }
        });
    }
}
