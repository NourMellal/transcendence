import { httpClient } from './client';
import {
  Tournament,
  TournamentBracketResponse,
  TournamentDTOs,
  TournamentSummary
} from '../../models';
import type { TournamentStatus } from '../../models';

const API_PREFIX = '';

/**
 * Tournament Service
 * Handles tournament creation, registration, and management
 */
export class TournamentService {
  /**
   * Create a new tournament
   */
  async createTournament(
    request: TournamentDTOs.CreateTournamentRequest
  ): Promise<TournamentDTOs.CreateTournamentResponse> {
    const response = await httpClient.post<TournamentDTOs.CreateTournamentResponse>(
      `${API_PREFIX}/tournaments`,
      request
    );
    return response.data!;
  }

  /**
   * Get tournament details
   */
  async getTournament(tournamentId: string): Promise<Tournament> {
    const response = await httpClient.get<Tournament>(`${API_PREFIX}/tournaments/${tournamentId}`);
    return response.data!;
  }

  /**
   * Get list of tournaments
   */
  async listTournaments(params: {
    status?: TournamentStatus;
    search?: string;
  } = {}): Promise<TournamentSummary[]> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const queryString = query.toString();
    const endpoint = `${API_PREFIX}/tournaments${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<TournamentDTOs.TournamentListResponse>(endpoint);
    return response.data?.tournaments ?? [];
  }

  /**
   * Register for a tournament
   */
  async joinTournament(tournamentId: string, passcode?: string): Promise<TournamentDTOs.JoinTournamentResponse> {
    const query = passcode ? `?passcode=${encodeURIComponent(passcode)}` : '';
    const response = await httpClient.post<TournamentDTOs.JoinTournamentResponse>(
      `${API_PREFIX}/tournaments/${tournamentId}/join${query}`,
      {}
    );
    return response.data!;
  }

  /**
   * Start a tournament (for tournament creator)
   */
  async startTournament(tournamentId: string): Promise<TournamentDTOs.StartTournamentResponse> {
    const response = await httpClient.post<TournamentDTOs.StartTournamentResponse>(
      `${API_PREFIX}/tournaments/${tournamentId}/start`,
      {}
    );
    return response.data!;
  }

  /**
   * Leave a tournament (before it starts)
   */
  async leaveTournament(tournamentId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/tournaments/${tournamentId}/leave`, {});
  }

  /**
   * Get tournament bracket
   */
  async getTournamentBracket(tournamentId: string): Promise<TournamentBracketResponse> {
    const response = await httpClient.get<TournamentBracketResponse>(`${API_PREFIX}/tournaments/${tournamentId}/bracket`);
    return response.data!;
  }

  /**
   * Get user's tournaments (registered, participating, or created)
   */
  async getMyTournaments(status?: TournamentStatus): Promise<TournamentSummary[]> {
    const query = status ? `?status=${status}` : '';
    const response = await httpClient.get<TournamentDTOs.TournamentListResponse>(
      `${API_PREFIX}/tournaments/my-tournaments${query}`
    );
    return response.data?.tournaments ?? [];
  }

  async playMatch(tournamentId: string, matchId: string): Promise<TournamentDTOs.PlayMatchResponse> {
    const response = await httpClient.post<TournamentDTOs.PlayMatchResponse>(
      `${API_PREFIX}/tournaments/${tournamentId}/matches/${matchId}/play`,
      {}
    );
    return response.data!;
  }
}

// Export singleton instance
export const tournamentService = new TournamentService();
