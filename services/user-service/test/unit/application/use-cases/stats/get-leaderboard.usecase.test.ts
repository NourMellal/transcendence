import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLeaderboardUseCase } from '../../../../../src/application/use-cases/stats/get-leaderboard.usecase';
import type { UserRepository } from '../../../../../src/domain/ports/outbound/repositories';
import { createUser } from '../../../../../src/domain/entities/user.entity';
import { DisplayName, Email, UserId, Username } from '../../../../../src/domain/value-objects';

function makeUser(id: string, username: string) {
  return createUser({
    id: new UserId(id),
    email: new Email(`${username}@example.com`),
    username: new Username(username),
    displayName: new DisplayName(username),
    is2FAEnabled: false,
  });
}

describe('GetLeaderboardUseCase', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sorts by WIN_RATE and returns fractional winRate', async () => {
    const user1 = makeUser('u1', 'alice');
    const user2 = makeUser('u2', 'bob');

    const userRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn().mockResolvedValue(null),
      findByDisplayName: vi.fn().mockResolvedValue(null),
      search: vi.fn().mockResolvedValue([]),
      listAll: vi.fn().mockResolvedValue([user1, user2]),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    } satisfies UserRepository;

    const fetchImpl = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const playerId = url.searchParams.get('playerId');

      const games =
        playerId === 'u1'
          ? [
              // 3 wins, 1 loss => 0.75
              {
                player1: 'u1',
                player2: 'uX',
                status: 'FINISHED',
                mode: 'CLASSIC',
                score: { player1: 11, player2: 3 },
                winner: 'u1',
              },
              {
                player1: 'u1',
                player2: 'uY',
                status: 'FINISHED',
                mode: 'CLASSIC',
                score: { player1: 11, player2: 9 },
                winner: 'u1',
              },
              {
                player1: 'uZ',
                player2: 'u1',
                status: 'FINISHED',
                mode: 'CLASSIC',
                score: { player1: 7, player2: 11 },
                winner: 'u1',
              },
              {
                player1: 'u1',
                player2: 'uW',
                status: 'FINISHED',
                mode: 'CLASSIC',
                score: { player1: 5, player2: 11 },
                winner: 'uW',
              },
            ]
          : [
              // 1 win, 3 losses => 0.25
              {
                player1: 'u2',
                player2: 'uX',
                status: 'FINISHED',
                mode: 'CLASSIC',
                score: { player1: 2, player2: 11 },
                winner: 'uX',
              },
              {
                player1: 'u2',
                player2: 'uY',
                status: 'FINISHED',
                mode: 'CLASSIC',
                score: { player1: 11, player2: 9 },
                winner: 'u2',
              },
              {
                player1: 'uZ',
                player2: 'u2',
                status: 'FINISHED',
                mode: 'CLASSIC',
                score: { player1: 11, player2: 0 },
                winner: 'uZ',
              },
              {
                player1: 'u2',
                player2: 'uW',
                status: 'FINISHED',
                mode: 'CLASSIC',
                score: { player1: 6, player2: 11 },
                winner: 'uW',
              },
            ];

      const payload = {
        games: games.map((g, i) => ({
          id: `${playerId ?? 'unknown'}-${i}`,
          mode: g.mode,
          player1: g.player1,
          player2: g.player2,
          status: 'FINISHED',
          score: g.score,
          winner: g.winner,
          createdAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        })),
        total: games.length,
      };

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const useCase = new GetLeaderboardUseCase(userRepository, {
      gameServiceBaseUrl: 'http://game-service:3002',
      internalApiKey: 'test-key',
      fetchImpl,
    });

    const result = await useCase.execute({ limit: 10, type: 'WIN_RATE' });

    expect(result.topPlayers).toHaveLength(2);
    expect(result.topPlayers[0].user.username).toBe('alice');
    expect(result.topPlayers[0].stats.winRate).toBeCloseTo(0.75, 6);
    expect(result.topPlayers[1].user.username).toBe('bob');
    expect(result.topPlayers[1].stats.winRate).toBeCloseTo(0.25, 6);

    // Ensure it's fractional (0..1), not percent.
    expect(result.topPlayers[0].stats.winRate).toBeLessThanOrEqual(1);
    expect(result.topPlayers[1].stats.winRate).toBeLessThanOrEqual(1);

    expect(fetchImpl).toHaveBeenCalled();
  });
});
