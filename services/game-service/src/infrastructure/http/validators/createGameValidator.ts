import { CreateGameInput } from '../../../application/dto';

export function createGameValidator(payload: unknown): CreateGameInput {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload');
    }

    const {
        playerId,
        opponentId,
        mode,
        tournamentId,
        config
    } = payload as Record<string, unknown>;

    if (typeof playerId !== 'string' || playerId.length === 0) {
        throw new Error('playerId is required');
    }

    if (typeof mode !== 'string') {
        throw new Error('mode is required');
    }

    if (opponentId && typeof opponentId !== 'string') {
        throw new Error('opponentId must be a string');
    }

    return {
        playerId,
        opponentId: opponentId as string | undefined,
        mode: mode as CreateGameInput['mode'],
        tournamentId: tournamentId as string | undefined,
        config: (config as CreateGameInput['config']) || undefined
    };
}
