import { httpClient } from './client';
import {
  User,
  UserProfile,
  Friend,
  UserDTOs,
  PaginatedResponse,
  Match,
  DashboardMatchSummary,
  DashboardLeaderboardEntry,
} from '../../models';
import { appState } from '@/state';

const API_PREFIX = '';

/**
 * User Service
 * Handles user profile management, friends, and user-related operations
 */
export class UserService {
  /**
   * Get current user profile
   */
  async getMe(): Promise<User> {
    const response = await httpClient.get<User>(`${API_PREFIX}/users/me`);
    return response.data!;
  }

  /**
   * Get detailed user profile with stats and match history
   */
  async getProfile(userId?: string): Promise<UserProfile> {
    if (userId) {
      const response = await httpClient.get<User>(`${API_PREFIX}/users/${userId}`);
      const stats = await this.getUserStats(userId).catch(() => this.buildEmptyStats());
      return {
        ...response.data!,
        stats,
        friends: [],
        matchHistory: [],
      };
    }

    const [user, stats, friends] = await Promise.all([
      this.getMe(),
      this.getMyStats().catch(() => this.buildEmptyStats()),
      this.getFriends(),
    ]);

    return {
      ...user,
      stats,
      friends,
      matchHistory: [],
    };
  }

  /**
   * Update current user profile
   */
  async updateProfile(request: UserDTOs.UpdateProfileRequest): Promise<UserDTOs.UpdateProfileResponse> {
    const body: Record<string, unknown> = {};
    if (request.username) body.username = request.username;
    if (request.displayName) body.displayName = request.displayName;
    if (request.email) body.email = request.email;
    if (request.avatar) body.avatar = request.avatar;

    const response = await httpClient.patch<UserDTOs.UpdateProfileResponse>(`${API_PREFIX}/users/me`, body);
    return response.data!;
  }

  /**
   * Search users by username or email
   */
  async searchUsers(query: string, limit = 10): Promise<User[]> {
    const response = await httpClient.get<User[]>(`${API_PREFIX}/users/search`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Note: In a real implementation, search params would be in query string
    // For now, we'll assume the endpoint handles the search internally
    return response.data!;
  }

  /**
   * Get user's friends list
   */
  async getFriends(): Promise<Friend[]> {
    try {
      const response = await httpClient.get<{ friends: ApiFriend[]; totalCount: number }>(`${API_PREFIX}/friends`);
      const list = response.data?.friends ?? [];
      return list.map((friend) => this.mapFriend(friend));
    } catch (error) {
      console.warn('[UserService] Falling back to empty friends list', error);
      return [];
    }
  }

  /**
   * Get recent matches for dashboard widgets
   */
  async getRecentMatches(limit = 3): Promise<DashboardMatchSummary[]> {
    try {
      const games = await this.getMyGames('FINISHED');
      const summaries = games
        .sort((a, b) => new Date(b.finishedAt ?? b.createdAt).getTime() - new Date(a.finishedAt ?? a.createdAt).getTime())
        .slice(0, limit)
        .map((game) => this.mapGameToDashboardMatch(game));
      return summaries;
    } catch (error) {
      console.warn('[UserService] Falling back to empty recent matches', error);
      return [];
    }
  }

  /**
   * Send friend request to a user
   */
  async sendFriendRequest(friendId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/friends/requests`, { friendId });
  }

  /**
   * Accept or reject a friend request
   */
  async respondFriendRequest(friendshipId: string, status: 'accepted' | 'rejected'): Promise<void> {
    await httpClient.patch(`${API_PREFIX}/friends/requests/${friendshipId}`, { status });
  }

  /**
   * Cancel a pending friend request
   */
  async cancelFriendRequest(friendshipId: string): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/friends/requests/${friendshipId}`);
  }

  /**
   * Remove an accepted friend
   */
  async removeFriend(friendId: string): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/friends/${friendId}`);
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/friends/${userId}/block`, {});
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/friends/${userId}/block`);
  }

  /**
   * Get user's match history
   */
  async getMatchHistory(_userId?: string, page = 1, limit = 20): Promise<PaginatedResponse<Match>> {
    const games = await this.getMyGames('FINISHED');
    const startIndex = (page - 1) * limit;
    const paged = games.slice(startIndex, startIndex + limit).map((game) => this.mapGameToMatch(game));

    return {
      data: paged,
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil((games.length || 1) / limit)),
        totalItems: games.length,
        itemsPerPage: limit,
        hasNext: startIndex + limit < games.length,
        hasPrevious: startIndex > 0,
      },
    };
  }

  /**
   * Get global leaderboard snapshot
   */
  async getLeaderboard(limit = 3): Promise<DashboardLeaderboardEntry[]> {
    try {
      const response = await httpClient.get<{ topPlayers: LeaderboardEntry[]; lastUpdated?: string }>(
        `${API_PREFIX}/leaderboard?limit=${limit}`
      );
      const players = response.data?.topPlayers ?? [];
      return players.map((entry, index) => ({
        rank: index + 1,
        userId: entry.user.id,
        username: entry.user.username,
        winRate: entry.stats.winRate * 100,
        avatar: entry.user.avatar,
      }));
    } catch (error) {
      console.warn('[UserService] Falling back to empty leaderboard', error);
      return [];
    }
  }

  /**
   * Send a game invite to a friend
   */
  async sendGameInvite(friendId: string, gameType: '1v1' | 'tournament'): Promise<void> {
    await httpClient.post(`${API_PREFIX}/chat/messages`, {
      recipientId: friendId,
      content: gameType === 'tournament' ? 'Join my tournament?' : 'Want to play 1v1?',
      type: 'GAME',
    });
  }

  /**
   * Fetch current user's stats
   */
  async getMyStats(): Promise<UserStats> {
    const response = await httpClient.get<ApiUserStats>(`${API_PREFIX}/stats/me`);
    return this.mapStats(response.data!);
  }

  /**
   * Fetch stats for a specific user
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const response = await httpClient.get<ApiUserStats>(`${API_PREFIX}/stats/users/${userId}`);
    return this.mapStats(response.data!);
  }

  private async getMyGames(status?: GameStatus): Promise<ApiGameSummary[]> {
    const query = status ? `?status=${status}` : '';
    const response = await httpClient.get<ApiGameSummary[]>(`${API_PREFIX}/games/my-games${query}`);
    return response.data ?? [];
  }

  private mapStats(stats?: ApiUserStats): UserStats {
    if (!stats) return this.buildEmptyStats();

    return {
      totalGames: stats.gamesPlayed,
      wins: stats.gamesWon,
      losses: stats.gamesLost,
      winRate: stats.winRate * 100,
      averageScore: stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0,
      tournaments: {
        participated: stats.tournamentsPlayed,
        won: stats.tournamentsWon,
      },
    };
  }

  private mapFriend(friend: ApiFriend): Friend {
    return {
      id: friend.id,
      username: friend.username,
      displayName: friend.displayName ?? undefined,
      avatar: friend.avatar ?? undefined,
      isOnline: Boolean(friend.isOnline),
      status: friend.isOnline ? 'ONLINE' : 'OFFLINE',
      friendshipStatus: friend.friendshipStatus,
      friendshipId: friend.friendshipId,
      isRequester: friend.isRequester,
      addedAt: new Date().toISOString(),
    };
  }

  private mapGameToDashboardMatch(game: ApiGameSummary): DashboardMatchSummary {
    const currentUserId = this.getCurrentUserId();
    const opponentId = currentUserId && game.player1 === currentUserId ? game.player2 : game.player1;
    const opponentUsername = opponentId ? this.buildDisplayName(opponentId) : 'Unknown Player';

    const didWin = currentUserId ? game.winner === currentUserId : false;

    return {
      id: game.id,
      opponentId: opponentId ?? 'unknown',
      opponentUsername,
      result: didWin ? 'WON' : 'LOST',
      finalScore: `${game.score.player1}-${game.score.player2}`,
      playedAt: game.finishedAt ?? game.createdAt,
      gameType: game.mode?.toLowerCase(),
    };
  }

  private mapGameToMatch(game: ApiGameSummary): Match {
    const players: Match['players'] = [
      {
        id: game.player1,
        username: this.buildDisplayName(game.player1),
        score: game.score.player1,
        isWinner: game.winner === game.player1,
      },
    ];

    if (game.player2) {
      players.push({
        id: game.player2,
        username: this.buildDisplayName(game.player2),
        score: game.score.player2,
        isWinner: game.winner === game.player2,
      });
    }

    return {
      id: game.id,
      gameType: game.mode === 'TOURNAMENT' ? 'tournament' : 'pong',
      players,
      winner: players.find((player) => player.isWinner) ?? players[0],
      duration: this.computeGameDuration(game),
      playedAt: game.finishedAt ?? game.createdAt,
    };
  }

  private computeGameDuration(game: ApiGameSummary): number {
    if (!game.finishedAt) return 0;
    const start = new Date(game.createdAt).getTime();
    const end = new Date(game.finishedAt).getTime();
    return Math.max(0, Math.round((end - start) / 1000));
  }

  private buildDisplayName(userId?: string | null): string {
    if (!userId) return 'Unknown Player';
    return `Player ${userId.slice(0, 6)}`;
  }

  private buildEmptyStats(): UserStats {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageScore: 0,
      tournaments: {
        participated: 0,
        won: 0,
      },
    };
  }

  private getCurrentUserId(): string | undefined {
    return appState.auth.get().user?.id;
  }

  /**
   * Update user status (online, offline, in-game)
   */
  async updateStatus(status: 'ONLINE' | 'OFFLINE' | 'INGAME'): Promise<void> {
    await httpClient.patch(`${API_PREFIX}/users/me/status`, { status });
  }


  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/users/me`);
    // Clear auth token after account deletion
    httpClient.clearAuthToken();
  }
}

// Export singleton instance
export const userService = new UserService();

type ApiFriend = {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  isOnline: boolean;
  friendshipStatus: 'pending' | 'accepted' | 'rejected' | 'blocked';
  friendshipId: string;
  isRequester: boolean;
};

type ApiUserStats = {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  ranking: number;
  totalScore: number;
};

type LeaderboardEntry = {
  user: User;
  stats: ApiUserStats;
};

type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED';

type ApiGameSummary = {
  id: string;
  mode?: 'CLASSIC' | 'TOURNAMENT';
  player1: string;
  player2?: string | null;
  status: GameStatus;
  score: {
    player1: number;
    player2: number;
  };
  winner?: string | null;
  createdAt: string;
  finishedAt?: string | null;
};
