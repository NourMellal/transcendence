import { FastifyRequest, FastifyReply } from 'fastify';

export class AuthController {
  constructor(
    private start42LoginUseCase: any,
    private handle42CallbackUseCase: any
  ) {}

  async start42Login(req: FastifyRequest, reply: FastifyReply) {
    const result = this.start42LoginUseCase.execute();
    reply.redirect(result.authorizationUrl);
  }

  async handle42Callback(req: FastifyRequest, reply: FastifyReply) {
    const { code, state } = req.query as { code: string; state: string };
    const result = await this.handle42CallbackUseCase.execute({ code, state });
    reply.setCookie('session', result.sessionId);
    reply.redirect('/dashboard');
  }
}
