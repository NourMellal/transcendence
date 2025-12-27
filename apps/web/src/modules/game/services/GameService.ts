import { httpClient, ApiError } from '@/modules/shared/services/HttpClient';
import type {
  GameStateOutput,
  CreateGameRequest,
  CreateGameResponse
} from '../types/game.types';

/**
 * Response Types for Game API Operations
 */
export interface JoinGameResponse {
  success: boolean;
  game: GameStateOutput;
}

export interface LeaveGameResponse {
  success: boolean;
  message: string;
}

export interface SetReadyResponse {
  success: boolean;
  game: GameStateOutput;
}

/**
 * GameService - HTTP API client for game CRUD operations
 *
 * All requests go through API Gateway at /api/games
 * Follows AGENTS.md principles: clean service layer, direct HTTP calls
 */
class GameService {
   private readonly basePath = '/games';

  /**
   * Create a new game with specified settings
   * POST /api/games
   */
  async createGame(request: CreateGameRequest): Promise<CreateGameResponse> {
    try {
      console.log('[GameService] Creating game with request:', request);

      const response = await httpClient.post<CreateGameResponse>(this.basePath, request);

      console.log('[GameService] ✅ Game created:', response.data);
      return response.data!;
    } catch (error) {
      console.error('[GameService] ❌ Failed to create game:', error);
      throw new Error('Failed to create game. Please try again.');
    }
  }

  /**
   * Get game details by ID
   * GET /api/games/:gameId
   */
  async getGame(gameId: string): Promise<GameStateOutput> {
    try {
      console.log('[GameService] Fetching game:', gameId);

      const response = await httpClient.get<GameStateOutput>(`${this.basePath}/${gameId}`);

      console.log('[GameService] ✅ Game fetched:', (response.data as any)?.status);
      return response.data!;
    } catch (error) {
      console.error('[GameService] ❌ Failed to fetch game:', error);
      throw new Error('Game not found or no longer available.');
    }
  }

  /**
   * Join an existing game
   * POST /api/games/:gameId/join
   */
  async joinGame(gameId: string): Promise<GameStateOutput> {
    try {
      console.log('[GameService] Joining game:', gameId);

      const response = await httpClient.post<GameStateOutput>(`${this.basePath}/${gameId}/join`, {});

      console.log('[GameService] ✅ Joined game successfully');
      return response.data!;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        console.warn('[GameService] ⚠️ Cannot join game — lobby closed');
        throw new Error('GAME_JOIN_CONFLICT');
      }
      console.error('[GameService] ❌ Failed to join game:', error);
      throw new Error('Failed to join game. It may be full or already started.');
    }
  }

  /**
   * Leave a game
   * POST /api/games/:gameId/leave
   */
  async leaveGame(gameId: string): Promise<void> {
    try {
      console.log('[GameService] Leaving game:', gameId);

      await httpClient.post<LeaveGameResponse>(`${this.basePath}/${gameId}/leave`, {});

      console.log('[GameService] ✅ Left game successfully');
    } catch (error) {
      console.error('[GameService] ❌ Failed to leave game:', error);
      // Don't throw - leaving is best-effort
      console.warn('[GameService] ⚠️ Continuing despite leave failure');
    }
  }

  /**
   * Mark player as ready
   * POST /api/games/:gameId/ready
   */
  async setReady(gameId: string): Promise<void> {
    try {
      console.log('[GameService] Setting ready for game:', gameId);

      await httpClient.post<SetReadyResponse>(`${this.basePath}/${gameId}/ready`, {});

      console.log('[GameService] ✅ Player marked as ready');
    } catch (error) {
      console.error('[GameService] ❌ Failed to set ready:', error);
      throw new Error('Failed to mark as ready. Please try again.');
    }
  }

  /**
   * List available games (optional - for lobby list view)
   * GET /api/games
   */
  async listGames(params?: { status?: GameStateOutput['status']; limit?: number; offset?: number }): Promise<GameStateOutput[]> {
    try {
      console.log('[GameService] Fetching available games');

      const query = new URLSearchParams();
      if (params?.status) {
        query.set('status', params.status);
      }
      if (typeof params?.limit === 'number') {
        query.set('limit', String(params.limit));
      }
      if (typeof params?.offset === 'number') {
        query.set('offset', String(params.offset));
      }

      const endpoint = query.toString() ? `${this.basePath}?${query.toString()}` : this.basePath;

      const response = await httpClient.get<{ games: GameStateOutput[]; total: number }>(endpoint);

      console.log('[GameService] ✅ Fetched', response.data?.games?.length ?? 0, 'games');
      return response.data!.games;
    } catch (error) {
      console.error('[GameService] ❌ Failed to list games:', error);
      throw new Error('Failed to load available games.');
    }
  }

}

/**
 * Export singleton instance
 */
export const gameService = new GameService();
