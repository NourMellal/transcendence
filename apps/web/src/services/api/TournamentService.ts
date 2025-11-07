import { httpClient } from './client';
import { 
  Tournament, 
  TournamentDTOs, 
  TournamentMatch,
  TournamentLeaderboard 
} from '../../models';

/**
 * Tournament Service
 * Handles tournament creation, registration, and management
 */
export class TournamentService {
  /**
   * Create a new tournament
   */
  async createTournament(request: TournamentDTOs.CreateTournamentRequest): Promise<TournamentDTOs.CreateTournamentResponse> {
    const response = await httpClient.post<TournamentDTOs.CreateTournamentResponse>('/tournaments', request);
    return response.data!;
  }

  /**
   * Get tournament details
   */
  async getTournament(tournamentId: string): Promise<Tournament> {
    const response = await httpClient.get<Tournament>(`/tournaments/${tournamentId}`);
    return response.data!;
  }

  /**
   * Get list of tournaments
   */
  async getTournaments(
    status?: 'registration' | 'in_progress' | 'finished',
    page = 1, 
    limit = 20
  ): Promise<TournamentDTOs.TournamentListResponse> {
    let endpoint = `/tournaments?page=${page}&limit=${limit}`;
    if (status) {
      endpoint += `&status=${status}`;
    }
    
    const response = await httpClient.get<TournamentDTOs.TournamentListResponse>(endpoint);
    return response.data!;
  }

  /**
   * Register for a tournament
   */
  async registerForTournament(
    tournamentId: string, 
    request: TournamentDTOs.RegisterForTournamentRequest
  ): Promise<TournamentDTOs.RegisterForTournamentResponse> {
    const response = await httpClient.post<TournamentDTOs.RegisterForTournamentResponse>(
      `/tournaments/${tournamentId}/register`, 
      request
    );
    return response.data!;
  }

  /**
   * Unregister from a tournament (before it starts)
   */
  async unregisterFromTournament(tournamentId: string): Promise<void> {
    await httpClient.delete(`/tournaments/${tournamentId}/register`);
  }

  /**
   * Start a tournament (for tournament creator)
   */
  async startTournament(tournamentId: string): Promise<TournamentDTOs.StartTournamentResponse> {
    const response = await httpClient.post<TournamentDTOs.StartTournamentResponse>(
      `/tournaments/${tournamentId}/start`
    );
    return response.data!;
  }

  /**
   * Cancel a tournament (for tournament creator or admin)
   */
  async cancelTournament(tournamentId: string): Promise<void> {
    await httpClient.post(`/tournaments/${tournamentId}/cancel`);
  }

  /**
   * Get tournament matches
   */
  async getTournamentMatches(tournamentId: string, round?: number): Promise<TournamentMatch[]> {
    let endpoint = `/tournaments/${tournamentId}/matches`;
    if (round !== undefined) {
      endpoint += `?round=${round}`;
    }
    
    const response = await httpClient.get<TournamentMatch[]>(endpoint);
    return response.data!;
  }

  /**
   * Get tournament bracket
   */
  async getTournamentBracket(tournamentId: string): Promise<Tournament['bracket']> {
    const response = await httpClient.get<Tournament['bracket']>(`/tournaments/${tournamentId}/bracket`);
    return response.data!;
  }

  /**
   * Get tournament leaderboard
   */
  async getTournamentLeaderboard(tournamentId: string): Promise<TournamentDTOs.TournamentLeaderboardResponse> {
    const response = await httpClient.get<TournamentDTOs.TournamentLeaderboardResponse>(
      `/tournaments/${tournamentId}/leaderboard`
    );
    return response.data!;
  }

  /**
   * Get user's tournaments (registered, participating, or created)
   */
  async getMyTournaments(
    type: 'registered' | 'created' | 'all' = 'all',
    page = 1,
    limit = 20
  ): Promise<TournamentDTOs.TournamentListResponse> {
    const response = await httpClient.get<TournamentDTOs.TournamentListResponse>(
      `/tournaments/me?type=${type}&page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  /**
   * Get next match for user in a tournament
   */
  async getMyNextMatch(tournamentId: string): Promise<TournamentMatch | null> {
    try {
      const response = await httpClient.get<TournamentMatch>(`/tournaments/${tournamentId}/my-next-match`);
      return response.data!;
    } catch (error) {
      // No next match available
      return null;
    }
  }

  /**
   * Get tournament statistics
   */
  async getTournamentStats(tournamentId: string): Promise<{
    totalParticipants: number;
    totalMatches: number;
    completedMatches: number;
    currentRound: number;
    totalRounds: number;
    startedAt?: string;
    estimatedEndTime?: string;
  }> {
    const response = await httpClient.get<{
      totalParticipants: number;
      totalMatches: number;
      completedMatches: number;
      currentRound: number;
      totalRounds: number;
      startedAt?: string;
      estimatedEndTime?: string;
    }>(`/tournaments/${tournamentId}/stats`);
    return response.data!;
  }

  /**
   * Update tournament settings (for tournament creator)
   */
  async updateTournament(
    tournamentId: string, 
    updates: Partial<TournamentDTOs.CreateTournamentRequest>
  ): Promise<Tournament> {
    const response = await httpClient.patch<Tournament>(`/tournaments/${tournamentId}`, updates);
    return response.data!;
  }

  /**
   * Delete tournament (for tournament creator or admin)
   */
  async deleteTournament(tournamentId: string): Promise<void> {
    await httpClient.delete(`/tournaments/${tournamentId}`);
  }
}

// Export singleton instance
export const tournamentService = new TournamentService();
