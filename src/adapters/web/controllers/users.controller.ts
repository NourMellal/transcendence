import { FastifyRequest, FastifyReply } from 'fastify';

export class UsersController {
  constructor(
    private getMeUseCase: any,
    private updateProfileUseCase: any,
    private generate2FAUseCase: any,
    private enable2FAUseCase: any
  ) {}

  async getMe(req: FastifyRequest, reply: FastifyReply) {
    const sessionId = req.cookies.session;
    const user = await this.getMeUseCase.execute(sessionId);
    reply.send(user);
  }

  async updateProfile(req: FastifyRequest, reply: FastifyReply) {
    const sessionId = req.cookies.session;
    const updates = req.body as any;
    const user = await this.updateProfileUseCase.execute(sessionId, updates);
    reply.send(user);
  }

  async generate2FA(req: FastifyRequest, reply: FastifyReply) {
    const sessionId = req.cookies.session;
    const result = await this.generate2FAUseCase.execute(sessionId);
    reply.send(result);
  }

  async enable2FA(req: FastifyRequest, reply: FastifyReply) {
    const sessionId = req.cookies.session;
    const { secret, token } = req.body as { secret: string; token: string };
    await this.enable2FAUseCase.execute(sessionId, secret, token);
    reply.send({ success: true });
  }
}
