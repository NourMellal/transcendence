import {createGameSchema} from '@transcendence/shared-validation';
import { CreateGameInput } from '../../../application/dto';

export function createGameValidator(payload: unknown, playerId?: string): CreateGameInput {
  if (!playerId) {
    throw new Error('Missing authenticated user');
    }

  const parsed = createGameSchema.parse(payload);
  const config = parsed.config ?? {};

    return {
        playerId,
      opponentId: parsed.opponentId ?? undefined,
      mode: parsed.gameMode as CreateGameInput['mode'],
      isPrivate: parsed.isPrivate,
      config: {
        arenaWidth: config.arenaWidth,
        arenaHeight: config.arenaHeight,
        scoreLimit: config.scoreLimit,
        paddleSpeed: config.paddleSpeed,
        ballSpeed: config.ballSpeed
      },
      tournamentId: parsed.tournamentId,
      matchId: parsed.matchId
    };
}
