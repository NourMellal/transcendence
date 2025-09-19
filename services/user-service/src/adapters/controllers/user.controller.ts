import { FastifyRequest, FastifyReply } from 'fastify';
import { GetMeUseCase } from '../../core/use-cases/get-me.use-case';

export class UserController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase
  ) {}

  async getMe(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sessionId = req.cookies.session;
    
    if (!sessionId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    
    const user = await this.getMeUseCase.execute(sessionId);
    
    if (!user) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    
    reply.send({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      isTwoFAEnabled: user.isTwoFAEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  }
}
