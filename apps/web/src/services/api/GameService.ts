import { httpClient } from './client';
import {
  Game,
  GameDTOs,
  GameState,
  Match,
  PaginatedResponse
} from '../../models';

const API_PREFIX = '/api';

/**
 * Game Service
 * Handles game creation, joining, and real-time game operations
 */
export class GameService {
  /**
   * Create a new game
   */
  async createGame(request: GameDTOs.CreateGameRequest): Promise<GameDTOs.CreateGameResponse> {
    const response = await httpClient.post<GameDTOs.CreateGameResponse>(`${API_PREFIX}/games`, request);
    return response.data!;
  }

  /**
   * Join an existing game
   */
  async joinGame(request: GameDTOs.JoinGameRequest): Promise<GameDTOs.JoinGameResponse> {
    const response = await httpClient.post<GameDTOs.JoinGameResponse>(`${API_PREFIX}/games/join`, request);
    return response.data!;
  }

  /**
   * Leave a game
   */
  async leaveGame(gameId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/games/${gameId}/leave`);
  }

  /**
   * Get game details
   */
  async getGame(gameId: string): Promise<Game> {
    const response = await httpClient.get<Game>(`${API_PREFIX}/games/${gameId}`);
    return response.data!;
  }

  /**
   * Get current game state
   */
  async getGameState(gameId: string): Promise<GameState> {
    const response = await httpClient.get<GameState>(`${API_PREFIX}/games/${gameId}/state`);
    return response.data!;
  }

  /**
   * Send player move input
   */
  async sendMoveInput(gameId: string, input: GameDTOs.MoveInput): Promise<void> {
    await httpClient.post(`${API_PREFIX}/games/${gameId}/move`, input);
  }

  /**
   * Start a game (for game creator)
   */
  async startGame(gameId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/games/${gameId}/start`);
  }

  /**
   * Cancel a game (for game creator or admin)
   */
  async cancelGame(gameId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/games/${gameId}/cancel`);
  }

  /**
   * Get list of available games to join
   */
  async getAvailableGames(page = 1, limit = 20): Promise<GameDTOs.GameListResponse> {
    const response = await httpClient.get<GameDTOs.GameListResponse>(
      `${API_PREFIX}/games/available?page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  /**
   * Get list of user's games (current and completed)
   */
  async getMyGames(status?: 'waiting' | 'playing' | 'finished', page = 1, limit = 20): Promise<GameDTOs.GameListResponse> {
    let endpoint = `${API_PREFIX}/games/me?page=${page}&limit=${limit}`;
    if (status) {
      endpoint += `&status=${status}`;
    }
    
    const response = await httpClient.get<GameDTOs.GameListResponse>(endpoint);
    return response.data!;
  }

  /**
   * Get match details (completed game)
   */
  async getMatch(matchId: string): Promise<Match> {
    const response = await httpClient.get<Match>(`${API_PREFIX}/matches/${matchId}`);
    return response.data!;
  }

  /**
   * Get recent matches
   */
  async getRecentMatches(page = 1, limit = 20): Promise<PaginatedResponse<Match>> {
    const response = await httpClient.get<PaginatedResponse<Match>>(
      `${API_PREFIX}/matches/recent?page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  /**
   * Invite user to a game
   */
  async invitePlayer(gameId: string, userId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/games/${gameId}/invite`, { userId });
  }

  /**
   * Accept game invitation
   */
  async acceptInvitation(invitationId: string): Promise<GameDTOs.JoinGameResponse> {
    const response = await httpClient.post<GameDTOs.JoinGameResponse>(
      `${API_PREFIX}/games/invitations/${invitationId}/accept`
    );
    return response.data!;
  }

  /**
   * Decline game invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/games/invitations/${invitationId}/decline`);
  }

  /**
   * Get pending game invitations
   */
  async getInvitations(): Promise<Array<{
    id: string;
    gameId: string;
    game: Game;
    invitedBy: string;
    createdAt: string;
  }>> {
    const response = await httpClient.get<Array<{
      id: string;
      gameId: string;
      game: Game;
      invitedBy: string;
      createdAt: string;
    }>>(`${API_PREFIX}/games/invitations`);
    return response.data!;
  }

  /**
   * Find match (matchmaking)
   */
  async findMatch(gameType: 'pong' | 'custom' = 'pong'): Promise<GameDTOs.JoinGameResponse> {
    const response = await httpClient.post<GameDTOs.JoinGameResponse>(`${API_PREFIX}/games/matchmaking`, { gameType });
    return response.data!;
  }

  /**
   * Cancel matchmaking
   */
  async cancelMatchmaking(): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/games/matchmaking`);
  }
}

// Export singleton instance
export const gameService = new GameService();
