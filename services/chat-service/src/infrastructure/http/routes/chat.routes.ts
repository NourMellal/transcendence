import { FastifyInstance } from 'fastify';
import { ChatController } from '../controllers/chat.contoller';

export async function chatRoutes(fastify: FastifyInstance, controller: ChatController) {
  fastify.post('/messages', async (request, reply) => {
    return controller.sendMessage(request, reply);
  });

  fastify.get('/messages', async (request, reply) => {
    return controller.getMessages(request, reply);
  });

  fastify.get('/conversations', async (request, reply) => {
    return controller.getConversations(request, reply);
  });
}
