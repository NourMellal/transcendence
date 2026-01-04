import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';  
import { ISendMessageUseCase } from '../../../application/use-cases/sendMessageUseCase';
import { IGetMessagesUseCase } from '../../../application/use-cases/get-messages.usecase';
import { IGetConversationsUseCase } from '../../../application/use-cases/get-conversation.usecase';
import { MessageType } from '../../../domain/value-objects/messageType';
import { RespondInviteUseCase } from '../../../application/use-cases/respond-invite.usecase';
import { InviteErrorCategorizer, InviteErrorType } from '../../../application/dto/invite-error.dto';

export class ChatController {
  constructor(
    private sendMessageUseCase: ISendMessageUseCase,
    private getMessagesUseCase: IGetMessagesUseCase,
    private getConversationsUseCase: IGetConversationsUseCase,
    private respondInviteUseCase: RespondInviteUseCase
  ) {}

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
        return reply.code(401).send({ 
          error: 'Unauthenticated request',
          errorType: InviteErrorType.UNAUTHORIZED
        });
      }
      
      const { inviteId } = request.params as { inviteId: string };
      
      // Check if result contains an error (from error handler)
      const result = await this.respondInviteUseCase.accept({
        inviteId,
        responderId: user.id.toString(),
        responderUsername: user.username,
      });

      if ((result as any).error) {
        const errorType = InviteErrorCategorizer.categorize(
          new Error((result as any).error)
        );
        const statusCode = InviteErrorCategorizer.toHttpStatus(errorType);
        
        return reply.code(statusCode).send({ 
          error: (result as any).error,
          errorType,
          inviteId 
        });
      }

      return reply.code(200).send({ 
        gameId: result.gameId,
        message: result
      });
    } catch (error: any) {
      const errorType = InviteErrorCategorizer.categorize(error);
      const statusCode = InviteErrorCategorizer.toHttpStatus(errorType);

      return reply.code(statusCode).send({ 
        error: error.message,
        errorType,
        inviteId: (request.params as any).inviteId
      });
    }
  }

  async declineInvite(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ 
          error: 'Unauthenticated request',
          errorType: InviteErrorType.UNAUTHORIZED
        });
      }
      
      const { inviteId } = request.params as { inviteId: string };
      
      const result = await this.respondInviteUseCase.decline({
        inviteId,
        responderId: user.id.toString(),
        responderUsername: user.username,
      });

      // Check if result contains an error (from error handler)
      if ((result as any).error) {
        const errorType = InviteErrorCategorizer.categorize(
          new Error((result as any).error)
        );
        const statusCode = InviteErrorCategorizer.toHttpStatus(errorType);
        
        return reply.code(statusCode).send({ 
          error: (result as any).error,
          errorType,
          inviteId 
        });
      }

      return reply.code(200).send({ 
        message: result
      });
    } catch (error: any) {
      const errorType = InviteErrorCategorizer.categorize(error);
      const statusCode = InviteErrorCategorizer.toHttpStatus(errorType);
      
      return reply.code(statusCode).send({ 
        error: error.message,
        errorType,
        inviteId: (request.params as any).inviteId
      });
    }
  }
}
