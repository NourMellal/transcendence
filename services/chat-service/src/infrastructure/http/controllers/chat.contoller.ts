import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';  
import { Server as SocketIOServer } from 'socket.io';
import { ISendMessageUseCase } from '../../../application/use-cases/sendMessageUseCase';
import { IGetMessagesUseCase } from '../../../application/use-cases/get-messages.usecase';
import { IGetConversationsUseCase } from '../../../application/use-cases/get-conversation.usecase';
import { MessageType } from '../../../domain/value-objects/messageType';
import { RespondInviteUseCase } from '../../../application/use-cases/respond-invite.usecase';

export class ChatController {
  private io: SocketIOServer | null = null;

  constructor(
    private sendMessageUseCase: ISendMessageUseCase,
    private getMessagesUseCase: IGetMessagesUseCase,
    private getConversationsUseCase: IGetConversationsUseCase,
    private respondInviteUseCase: RespondInviteUseCase
  ) {}

  setSocketServer(io: SocketIOServer): void {
    this.io = io;
  }

  register(app: FastifyInstance): void {
    app.post('/messages', this.sendMessage.bind(this));
    app.get('/messages', this.getMessages.bind(this));
    app.get('/conversations', this.getConversations.bind(this));
    app.post('/invites/:inviteId/accept', this.acceptInvite.bind(this));
    app.post('/invites/:inviteId/decline', this.declineInvite.bind(this));
  }

  async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthenticated request.' });
      }

      const body = request.body as any;

      const normalizedType = String(body.type || '').toUpperCase();
      if (!MessageType.isValid(normalizedType)) {
        return reply.code(400).send({ error: 'Invalid message type' });
      }

      const result = await this.sendMessageUseCase.execute({
        senderId: user.id.toString(),
        senderUsername: user.username,
        content: body.content,
        type: normalizedType as MessageType,
        recipientId: body.recipientId,
        gameId: body.gameId,
        invitePayload: body.invitePayload
      });

      return reply.code(201).send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async getMessages(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const user = request.user ;    
      if(!user)  
            return reply.code(401).send({ 
                    message: 'Unauthenticated request.' 
            })
      const result = await this.getMessagesUseCase.execute({
        type: String(query.type || '').toUpperCase() as MessageType,
        userId:user.id.toString(),
        recipientId: query.recipientId,
        gameId: query.gameId,
        limit: query.limit ? parseInt(query.limit) : undefined,
        before: query.before
      });

      return reply.send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async getConversations(request: FastifyRequest, reply: FastifyReply) {
    try {
        const user  =  request.user ;   
        if(!user)  
                return reply.code(401).send({message: 'Unauthenticated request.' }) ;   
        const result = await this.getConversationsUseCase.execute({
        userId: user.id.toString()
      });

      return reply.send(result);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  }

  async acceptInvite(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthenticated request.' });
      }
      const { inviteId } = request.params as { inviteId: string };
      const result = await this.respondInviteUseCase.accept({
        inviteId,
        responderId: user.id.toString(),
        responderUsername: user.username,
      });

      // Check if result contains an error (from error handler)
      if ((result as any).error) {
        // Emit error event via WebSocket if available
        if (this.io) {
          this.io.to(`user:${user.id.toString()}`).emit('invite_error', {
            error: (result as any).error,
            errorType: (result as any).errorType,
            inviteId
          });
        }
        
        return reply.code(400).send({ 
          error: (result as any).error,
          errorType: (result as any).errorType,
          inviteId 
        });
      }

      // Emit invite_accepted event to the original inviter via WebSocket
      if (this.io && result.recipientId) {
        const inviteAcceptedPayload = {
          inviteId,
          gameId: result.gameId,
          acceptedBy: result.senderId,
          acceptedByUsername: result.senderUsername
        };
        console.log(`[ChatController] Emitting invite_accepted to user:${result.recipientId}`, inviteAcceptedPayload);
        this.io.to(`user:${result.recipientId}`).emit('invite_accepted', inviteAcceptedPayload);

        // Also emit new_message to both users
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
        this.io.to(`user:${result.senderId}`).emit('new_message', responsePayload);
        this.io.to(`user:${result.recipientId}`).emit('new_message', responsePayload);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      // Categorize error for better handling
      let statusCode = 400;
      let errorType = 'UNKNOWN';
      
      if (error.message.includes('timeout')) {
        statusCode = 504;
        errorType = 'TIMEOUT';
      } else if (error.message.includes('Unauthenticated') || error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('already been responded')) {
        statusCode = 409;
        errorType = 'ALREADY_RESPONDED';
      }
      
      // Emit error via WebSocket if available
      const user = request.user;
      if (this.io && user) {
        this.io.to(`user:${user.id.toString()}`).emit('invite_error', {
          error: error.message,
          errorType,
          inviteId: (request.params as any).inviteId
        });
      }
      
      return reply.code(statusCode).send({ 
        error: error.message,
        errorType 
      });
    }
  }

  async declineInvite(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthenticated request.' });
      }
      const { inviteId } = request.params as { inviteId: string };
      const result = await this.respondInviteUseCase.decline({
        inviteId,
        responderId: user.id.toString(),
        responderUsername: user.username,
      });

      // Emit invite_declined event to the original inviter via WebSocket
      if (this.io && result.recipientId) {
        const inviteDeclinedPayload = {
          inviteId,
          declinedBy: result.senderId,
          declinedByUsername: result.senderUsername
        };
        console.log(`[ChatController] Emitting invite_declined to user:${result.recipientId}`, inviteDeclinedPayload);
        this.io.to(`user:${result.recipientId}`).emit('invite_declined', inviteDeclinedPayload);

        // Also emit new_message to both users
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
        this.io.to(`user:${result.senderId}`).emit('new_message', responsePayload);
        this.io.to(`user:${result.recipientId}`).emit('new_message', responsePayload);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }
}
