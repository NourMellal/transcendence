import { HttpClient } from './HttpClient.js';
import {
  Tournament,
  TournamentListParams,
  TournamentListResult,
  CreateTournamentRequest,
  CreateTournamentResponse,
  JoinTournamentResponse,
  LeaveTournamentResponse,
  Bracket,
  ReportMatchResultRequest,
  Match,
} from '../../../models/Tournament';

export class TournamentService {
  private http: HttpClient;

  constructor(baseURL: string = '/api') {
    this.http = new HttpClient(baseURL);
  }

  async list(params: TournamentListParams = {}): Promise<TournamentListResult> {
    try {
      const qs = new URLSearchParams();
      if (params.status) qs.append('status', params.status);
      if (params.page != null) qs.append('page', String(params.page));
      if (params.limit != null) qs.append('limit', String(params.limit));
      const query = qs.toString();
      return await this.http.get<TournamentListResult>(`/tournaments${query ? `?${query}` : ''}`);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async create(payload: CreateTournamentRequest): Promise<CreateTournamentResponse> {
    try {
      return await this.http.post<CreateTournamentResponse>('/tournaments', payload);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async get(id: string): Promise<Tournament> {
    try {
      return await this.http.get<Tournament>(`/tournaments/${id}`);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async join(id: string): Promise<JoinTournamentResponse> {
    try {
      return await this.http.post<JoinTournamentResponse>(`/tournaments/${id}/join`, {});
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async leave(id: string): Promise<LeaveTournamentResponse> {
    try {
      return await this.http.post<LeaveTournamentResponse>(`/tournaments/${id}/leave`, {});
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async getBracket(id: string): Promise<Bracket> {
    try {
      return await this.http.get<Bracket>(`/tournaments/${id}/bracket`);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async reportMatchResult(tournamentId: string, matchId: string, payload: ReportMatchResultRequest): Promise<Match> {
    try {
      return await this.http.post<Match>(`/tournaments/${tournamentId}/matches/${matchId}/result`, payload);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async pollBracket(id: string, onUpdate: (bracket: Bracket) => void, intervalMs = 5000): Promise<() => void> {
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const bracket = await this.getBracket(id);
        onUpdate(bracket);
      } catch (e) {
        console.debug('pollBracket error:', e);
      } finally {
        if (!stopped) setTimeout(tick, intervalMs);
      }
    };
    setTimeout(tick, intervalMs);
    return () => { stopped = true; };
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      const anyErr = error as any;
      const message = anyErr?.body?.message || anyErr.message || 'Request failed';
      const e = new Error(message);
      (e as any).status = anyErr.status;
      (e as any).body = anyErr.body;
      return e;
    }
    return new Error('An unexpected error occurred');
  }
}
