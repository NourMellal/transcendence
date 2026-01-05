import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validateInternalApiKey } from '../middlewares/internal-api.middleware';
import type { GetLeaderboardInput,LeaderboardType } from '../../../application/dto/user.dto';
import { StatsController } from '../controllers/stats.controller';

const ALLOWED_TYPES: ReadonlySet<LeaderboardType> = new Set([
  'GAMES_WON',
  'WIN_RATE',
  'TOURNAMENTS_WON',
  'TOTAL_SCORE',
]);

export function registerStatsRoutes(
  fastify: FastifyInstance,
  statsController: StatsController
) {
  fastify.get(
    '/leaderboard',
    {
      preHandler: [validateInternalApiKey],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { limit, type } =
        (request.query as Partial<Record<'limit' | 'type', string>>) ?? {};

      const parsedType =
        type && ALLOWED_TYPES.has(type as LeaderboardType)
          ? (type as LeaderboardType)
          : undefined;

      const input: GetLeaderboardInput = {
        limit: limit ? Number(limit) : undefined,
        type: parsedType,
      };

      return statsController.getLeaderboard(request, reply, input);
    }
  );
}
