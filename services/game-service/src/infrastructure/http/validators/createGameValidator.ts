import {createGameSchema} from '@transcendence/shared-validation';
import { CreateGameInput } from '../../../application/dto';

export function createGameValidator(payload: unknown, playerId?: string): CreateGameInput {
  if (!playerId) {
    throw new Error('Missing authenticated user');
    }

  const parsed = createGameSchema.parse(payload);

    return {
        playerId,
      mode: parsed.gameMode.toLowerCase() as CreateGameInput['mode'],
      isPrivate: parsed.isPrivate,
      config: {},
      tournamentId: undefined
    };
}
