import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  GetLeaderboardInput,
  IGetLeaderboardUseCase,
} from '../../../application/use-cases/stats/get-leaderboard.usecase';

export class StatsController {
  constructor(private readonly getLeaderboardUseCase: IGetLeaderboardUseCase) {}

  async getLeaderboard(
    request: FastifyRequest,
    reply: FastifyReply,
    input: GetLeaderboardInput
  ): Promise<void> {
    try {
      const leaderboard = await this.getLeaderboardUseCase.execute(input);
      reply.code(200).send(leaderboard);
    } catch (error: unknown) {
      request.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while generating the leaderboard',
      });
    }
  }
}
