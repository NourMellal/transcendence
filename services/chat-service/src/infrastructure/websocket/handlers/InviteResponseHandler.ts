import { Socket, Server as SocketIOServer } from 'socket.io';
import { RespondInviteUseCase } from '../../../application/use-cases/respond-invite.usecase';
import { logger } from '../../config';

export class InviteResponseHandler {
    private io: SocketIOServer | null = null;

    constructor(private readonly respondInviteUseCase: RespondInviteUseCase) {}

    setServer(io: SocketIOServer): void {
        this.io = io;
    }

    register(socket: Socket): void {
        socket.on('accept_invite', async (data) => {
            try {
                const userId = socket.data.userId;
                const username = socket.data.username;
                const inviteId = data?.inviteId;

                if (!inviteId) {
                    throw new Error('inviteId is required');
                }

                const result = await this.respondInviteUseCase.accept({
                    inviteId,
                    responderId: userId,
                    responderUsername: username,
                });

                // Check if result contains an error (from error handler)
                if ((result as any).error) {
                    socket.emit('invite_error', { 
                        error: (result as any).error,
                        errorType: (result as any).errorType,
                        inviteId 
                    });
                    return;
                }

                if (this.io && result.recipientId) {
                    const responsePayload = {
                        id: result.id,
                        conversationId: result.conversationId,
                        senderId: result.senderId,
                        senderUsername: result.senderUsername,
                        content: result.content,
                        type: result.type,
                        recipientId: result.recipientId,
                        gameId: result.gameId,
                        invitePayload: result.invitePayload,
                        createdAt: result.createdAt
                    };

                    // Check if original sender is in the room
                    const senderRoom = this.io.sockets.adapter.rooms.get(`user:${result.recipientId}`);
                    logger.info(`[InviteResponseHandler] Original sender room user:${result.recipientId} has ${senderRoom?.size || 0} sockets`);

                    // Notify both users about the new message
                    this.io.to(`user:${result.senderId}`).emit('new_message', responsePayload);
                    this.io.to(`user:${result.recipientId}`).emit('new_message', responsePayload);
                    
                    // Send specific invite_accepted event to the ORIGINAL SENDER (recipientId in the response message)
                    // result.recipientId is the original invite sender
                    // result.senderId is the one who accepted (responder)
                    const inviteAcceptedPayload = {
                        inviteId,
                        gameId: result.gameId,
                        acceptedBy: result.senderId,
                        acceptedByUsername: result.senderUsername
                    };
                    logger.info(`[InviteResponseHandler] Emitting invite_accepted to user:${result.recipientId}`, inviteAcceptedPayload);
                    this.io.to(`user:${result.recipientId}`).emit('invite_accepted', inviteAcceptedPayload);
                }

                socket.emit('invite_accepted_success', { 
                    success: true, 
                    gameId: result.gameId,
                    message: result 
                });
            } catch (error) {
                const err = error as Error;
                logger.error(`Failed to accept invite: ${err.message}`);
                
                // Determine error type for better client-side handling
                let errorType = 'UNKNOWN';
                if (err.message.includes('timeout')) {
                    errorType = 'TIMEOUT';
                } else if (err.message.includes('game')) {
                    errorType = 'GAME_CREATION_FAILED';
                } else if (err.message.includes('already been responded')) {
                    errorType = 'ALREADY_RESPONDED';
                }
                
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
                    throw new Error('inviteId is required');
                }

                const result = await this.respondInviteUseCase.decline({
                    inviteId,
                    responderId: userId,
                    responderUsername: username,
                });

                if (this.io && result.recipientId) {
                    const responsePayload = {
                        id: result.id,
                        conversationId: result.conversationId,
                        senderId: result.senderId,
                        senderUsername: result.senderUsername,
                        content: result.content,
                        type: result.type,
                        recipientId: result.recipientId,
                        gameId: result.gameId,
                        invitePayload: result.invitePayload,
                        createdAt: result.createdAt
                    };

                    // Notify both users about the new message
                    this.io.to(`user:${result.senderId}`).emit('new_message', responsePayload);
                    this.io.to(`user:${result.recipientId}`).emit('new_message', responsePayload);
                    
                    // Send specific invite_declined event to the ORIGINAL SENDER (recipientId in the response message)
                    const inviteDeclinedPayload = {
                        inviteId,
                        declinedBy: result.senderId,
                        declinedByUsername: result.senderUsername
                    };
                    logger.info(`[InviteResponseHandler] Emitting invite_declined to user:${result.recipientId}`, inviteDeclinedPayload);
                    this.io.to(`user:${result.recipientId}`).emit('invite_declined', inviteDeclinedPayload);
                }

                socket.emit('invite_declined_success', { 
                    success: true, 
                    message: result 
                });
            } catch (error) {
                const err = error as Error;
                logger.error(`Failed to decline invite: ${err.message}`);
                socket.emit('invite_error', { error: err.message });
            }
        });
    }
}
