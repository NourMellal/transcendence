import { httpClient } from './HttpClient';
import { 
  Game, 
  GameDTOs, 
  GameState, 
  Match,
  PaginatedResponse 
} from '../../models';

/**
 * Game Service
 * Handles game creation, joining, and real-time game operations
 */
export class GameService {
  /**
   * Create a new game
   */
  async createGame(request: GameDTOs.CreateGameRequest): Promise<GameDTOs.CreateGameResponse> {
    const response = await httpClient.post<GameDTOs.CreateGameResponse>('/games', request);
    return response.data!;
  }

  /**
   * Join an existing game
   */
  async joinGame(request: GameDTOs.JoinGameRequest): Promise<GameDTOs.JoinGameResponse> {
    const response = await httpClient.post<GameDTOs.JoinGameResponse>('/games/join', request);
    return response.data!;
  }

  /**
   * Leave a game
   */
  async leaveGame(gameId: string): Promise<void> {
    await httpClient.post(`/games/${gameId}/leave`);
  }

  /**
   * Get game details
   */
  async getGame(gameId: string): Promise<Game> {
    const response = await httpClient.get<Game>(`/games/${gameId}`);
    return response.data!;
  }

  /**
   * Get current game state
   */
  async getGameState(gameId: string): Promise<GameState> {
    const response = await httpClient.get<GameState>(`/games/${gameId}/state`);
    return response.data!;
  }

  /**
   * Send player move input
   */
  async sendMoveInput(gameId: string, input: GameDTOs.MoveInput): Promise<void> {
    await httpClient.post(`/games/${gameId}/move`, input);
  }

  /**
   * Start a game (for game creator)
   */
  async startGame(gameId: string): Promise<void> {
    await httpClient.post(`/games/${gameId}/start`);
  }

  /**
   * Cancel a game (for game creator or admin)
   */
  async cancelGame(gameId: string): Promise<void> {
    await httpClient.post(`/games/${gameId}/cancel`);
  }

  /**
   * Get list of available games to join
   */
  async getAvailableGames(page = 1, limit = 20): Promise<GameDTOs.GameListResponse> {
    const response = await httpClient.get<GameDTOs.GameListResponse>(
      `/games/available?page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  /**
   * Get list of user's games (current and completed)
   */
  async getMyGames(status?: 'waiting' | 'playing' | 'finished', page = 1, limit = 20): Promise<GameDTOs.GameListResponse> {
    let endpoint = `/games/me?page=${page}&limit=${limit}`;
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
    const response = await httpClient.get<Match>(`/matches/${matchId}`);
    return response.data!;
  }

  /**
   * Get recent matches
   */
  async getRecentMatches(page = 1, limit = 20): Promise<PaginatedResponse<Match>> {
    const response = await httpClient.get<PaginatedResponse<Match>>(
      `/matches/recent?page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  /**
   * Invite user to a game
   */
  async invitePlayer(gameId: string, userId: string): Promise<void> {
    await httpClient.post(`/games/${gameId}/invite`, { userId });
  }

  /**
   * Accept game invitation
   */
  async acceptInvitation(invitationId: string): Promise<GameDTOs.JoinGameResponse> {
    const response = await httpClient.post<GameDTOs.JoinGameResponse>(
      `/games/invitations/${invitationId}/accept`
    );
    return response.data!;
  }

  /**
   * Decline game invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    await httpClient.post(`/games/invitations/${invitationId}/decline`);
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
    }>>('/games/invitations');
    return response.data!;
  }

  /**
   * Find match (matchmaking)
   */
  async findMatch(gameType: 'pong' | 'custom' = 'pong'): Promise<GameDTOs.JoinGameResponse> {
    const response = await httpClient.post<GameDTOs.JoinGameResponse>('/games/matchmaking', { gameType });
    return response.data!;
  }

  /**
   * Cancel matchmaking
   */
  async cancelMatchmaking(): Promise<void> {
    await httpClient.delete('/games/matchmaking');
  }
}

// Export singleton instance
export const gameService = new GameService();