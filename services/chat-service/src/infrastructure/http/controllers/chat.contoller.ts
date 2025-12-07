import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';  
import { ISendMessageUseCase } from '../../../application/use-cases/sendMessageUseCase';
import { IGetMessagesUseCase } from '../../../application/use-cases/get-messages.usecase';
import { IGetConversationsUseCase } from '../../../application/use-cases/get-conversation.usecase';

export class ChatController {
  constructor(
    private sendMessageUseCase: ISendMessageUseCase,
    private getMessagesUseCase: IGetMessagesUseCase,
    private getConversationsUseCase: IGetConversationsUseCase
  ) {}

  register(app: FastifyInstance): void {
    app.post('/messages', this.sendMessage.bind(this));
    app.get('/messages', this.getMessages.bind(this));
    app.get('/conversations', this.getConversations.bind(this));
  }

  async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthenticated request.' });
      }

      const body = request.body as any;

      const result = await this.sendMessageUseCase.execute({
        senderId: user.id.toString(),
        senderUsername: user.username,
        content: body.content,
        type: body.type,
        recipientId: body.recipientId,
        gameId: body.gameId
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
        type: query.type,
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
}
