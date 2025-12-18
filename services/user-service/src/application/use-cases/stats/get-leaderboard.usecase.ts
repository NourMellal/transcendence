import type { UserRepository } from '../../../domain/ports/outbound/repositories';
import type { UserProfileDTO } from '../../dto/user.dto';
import { UserMapper } from '../../mappers/user.mapper';
import { PresenceStatus } from '../../../domain/entities/presence.entity';
import { createUserServiceVault } from '@transcendence/shared-utils';
import type { User } from '../../../domain/entities/user.entity';

export type LeaderboardType = 'GAMES_WON' | 'WIN_RATE' | 'TOURNAMENTS_WON' | 'TOTAL_SCORE';

export interface UserStatsDTO {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  ranking: number;
  totalScore: number;
}

export interface LeaderboardEntryDTO {
  user: UserProfileDTO;
  stats: UserStatsDTO;
}

export interface LeaderboardDTO {
  topPlayers: LeaderboardEntryDTO[];
  lastUpdated: string;
}

export interface GetLeaderboardInput {
  limit?: number;
  type?: LeaderboardType;
}

export interface IGetLeaderboardUseCase {
  execute(input: GetLeaderboardInput): Promise<LeaderboardDTO>;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const ENV = {
  GAME_SERVICE_URL: 'GAME_SERVICE_URL',
} as const;

type ApiGameSummary = {
  id: string;
  mode?: string | null;
  player1: string | null;
  player2: string | null;
  status: 'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED' | string;
  score: { player1: number; player2: number };
  winner: string | null;
  createdAt: string;
  finishedAt: string | null;
};

let cachedInternalApiKey: string | null = null;
let fetchingInternalApiKey: Promise<string> | null = null;

async function loadInternalApiKey(): Promise<string> {
  if (cachedInternalApiKey) {
    return cachedInternalApiKey;
  }

  if (!fetchingInternalApiKey) {
    fetchingInternalApiKey = (async () => {
      const vault = createUserServiceVault();
      await vault.initialize();
      const key = await vault.getInternalApiKey();
      if (!key) {
        throw new Error('INTERNAL_API_KEY not found in Vault. Run: pnpm vault:setup');
      }
      cachedInternalApiKey = key;
      return key;
    })().finally(() => {
      fetchingInternalApiKey = null;
    });
  }

  return fetchingInternalApiKey;
}

export class GetLeaderboardUseCase implements IGetLeaderboardUseCase {
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly MAX_LIMIT = 100;
  private static readonly USERS_PAGE_SIZE = 500;
  private static readonly MAX_USERS_SCANNED = 20_000;
  private static readonly GAMES_PAGE_SIZE = 200;
  private static readonly MAX_GAMES_PER_USER = 5_000;

  private readonly gameServiceBaseUrl: string;
  private readonly internalApiKey?: string;
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly userRepository: UserRepository,
    options?: {
      gameServiceBaseUrl?: string;
      internalApiKey?: string;
      fetchImpl?: FetchLike;
    }
  ) {
    const gameServiceBaseUrl =
      options?.gameServiceBaseUrl ?? process.env[ENV.GAME_SERVICE_URL];

    if (!gameServiceBaseUrl) {
      throw new Error(
        `${ENV.GAME_SERVICE_URL} is required (or pass gameServiceBaseUrl). It must point to the game-service base URL.`
      );
    }

    this.gameServiceBaseUrl = gameServiceBaseUrl;
    this.internalApiKey = options?.internalApiKey;
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async execute(input: GetLeaderboardInput): Promise<LeaderboardDTO> {
    const limit = this.normalizeLimit(input.limit);
    const type: LeaderboardType = input.type ?? 'GAMES_WON';

    const users = await this.fetchAllUsers();

    const rows: Array<{ user: UserProfileDTO; stats: Omit<UserStatsDTO, 'ranking'> }> = [];
    for (const user of users) {
      const userDTO = UserMapper.toProfileDTO(user, PresenceStatus.OFFLINE);
      try {
        const stats = await this.computeStatsForUser(userDTO.id);
        rows.push({ user: userDTO, stats });
      } catch {
        rows.push({
          user: userDTO,
          stats: {
            userId: userDTO.id,
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            winRate: 0,
            tournamentsPlayed: 0,
            tournamentsWon: 0,
            totalScore: 0,
          },
        });
      }
    }

    rows.sort((a, b) => {
      const primary = this.compareByType(type, a.stats, b.stats);
      if (primary !== 0) return primary;
      return a.user.username.localeCompare(b.user.username);
    });

    const topPlayers: LeaderboardEntryDTO[] = rows.slice(0, limit).map((row, index) => ({
      user: row.user,
      stats: {
        ...row.stats,
        ranking: index + 1,
      },
    }));

    return {
      topPlayers,
      lastUpdated: new Date().toISOString(),
    };
  }

  private normalizeLimit(limit?: number): number {
    if (!Number.isFinite(limit)) return GetLeaderboardUseCase.DEFAULT_LIMIT;
    const normalized = Math.floor(limit as number);
    if (normalized < 1) return 1;
    if (normalized > GetLeaderboardUseCase.MAX_LIMIT) return GetLeaderboardUseCase.MAX_LIMIT;
    return normalized;
  }

  private compareByType(
    type: LeaderboardType,
    a: Omit<UserStatsDTO, 'ranking'>,
    b: Omit<UserStatsDTO, 'ranking'>
  ): number {
    switch (type) {
      case 'WIN_RATE':
        return b.winRate - a.winRate;
      case 'TOURNAMENTS_WON':
        return b.tournamentsWon - a.tournamentsWon;
      case 'TOTAL_SCORE':
        return b.totalScore - a.totalScore;
      case 'GAMES_WON':
      default:
        return b.gamesWon - a.gamesWon;
    }
  }

  private async fetchAllUsers() {
    const users: User[] = [];
    let offset = 0;

    while (users.length < GetLeaderboardUseCase.MAX_USERS_SCANNED) {
      const page = await this.userRepository.listAll(GetLeaderboardUseCase.USERS_PAGE_SIZE, offset);
      users.push(...page);
      if (page.length < GetLeaderboardUseCase.USERS_PAGE_SIZE) break;
      offset += GetLeaderboardUseCase.USERS_PAGE_SIZE;
    }

    return users;
  }

  private async computeStatsForUser(userId: string): Promise<Omit<UserStatsDTO, 'ranking'>> {
    const games = await this.fetchFinishedGamesForUser(userId);
    if (!games.length) {
      return {
        userId,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0,
        tournamentsPlayed: 0,
        tournamentsWon: 0,
        totalScore: 0,
      };
    }

    let gamesPlayed = 0;
    let gamesWon = 0;
    let totalScore = 0;
    let tournamentsPlayed = 0;
    let tournamentsWon = 0;

    for (const game of games) {
      const isPlayer1 = game.player1 === userId;
      const isPlayer2 = game.player2 === userId;
      if (!isPlayer1 && !isPlayer2) {
        continue;
      }

      gamesPlayed += 1;
      const didWin = game.winner === userId;
      if (didWin) {
        gamesWon += 1;
      }

      const myScore = isPlayer1 ? game.score.player1 : game.score.player2;
      totalScore += typeof myScore === 'number' ? myScore : 0;

      if ((game.mode ?? '').toUpperCase() === 'TOURNAMENT') {
        tournamentsPlayed += 1;
        if (didWin) {
          tournamentsWon += 1;
        }
      }
    }

    const gamesLost = Math.max(0, gamesPlayed - gamesWon);
    const winRate = gamesPlayed > 0 ? Number((gamesWon / gamesPlayed).toFixed(4)) : 0;

    return {
      userId,
      gamesPlayed,
      gamesWon,
      gamesLost,
      winRate,
      tournamentsPlayed,
      tournamentsWon,
      totalScore,
    };
  }

  private async fetchFinishedGamesForUser(userId: string): Promise<ApiGameSummary[]> {
    const internalApiKey = this.internalApiKey ?? (await loadInternalApiKey());

    const games: ApiGameSummary[] = [];
    let offset = 0;
    let total: number | null = null;

    while (games.length < GetLeaderboardUseCase.MAX_GAMES_PER_USER) {
      const url = new URL('/games', this.gameServiceBaseUrl);
      url.searchParams.set('status', 'FINISHED');
      url.searchParams.set('playerId', userId);
      url.searchParams.set('limit', String(GetLeaderboardUseCase.GAMES_PAGE_SIZE));
      url.searchParams.set('offset', String(offset));

      const response = await this.fetchImpl(url.toString(), {
        method: 'GET',
        headers: {
          'x-internal-api-key': internalApiKey,
        },
      });

      if (!response.ok) {
        // Fail closed: if game-service can't be queried, stats are unavailable.
        throw new Error(`Failed to fetch games for user ${userId}: ${response.status}`);
      }

      const data = (await response.json()) as { games?: ApiGameSummary[]; total?: number };
      const page = Array.isArray(data.games) ? data.games : [];
      if (total === null && typeof data.total === 'number') {
        total = data.total;
      }

      games.push(...page);

      if (page.length < GetLeaderboardUseCase.GAMES_PAGE_SIZE) {
        break;
      }
      offset += GetLeaderboardUseCase.GAMES_PAGE_SIZE;
      if (total !== null && offset >= total) {
        break;
      }
    }

    return games;
  }
}
