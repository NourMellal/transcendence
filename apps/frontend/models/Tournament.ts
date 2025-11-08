import type { User } from './User';

export type TournamentStatus = 'draft' | 'open' | 'ongoing' | 'completed' | 'cancelled';

export interface TournamentParticipant {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface Tournament {
  id: string;
  title: string;
  status: TournamentStatus;
  maxParticipants?: number;
  participants: TournamentParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  round: number;
  player1Id?: string;
  player2Id?: string;
  score1?: number;
  score2?: number;
  winnerId?: string;
}

export interface Bracket {
  matches: Match[];
}

export interface TournamentListParams {
  status?: TournamentStatus;
  page?: number;
  limit?: number;
}

export interface TournamentListResult {
  tournaments: Tournament[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreateTournamentRequest {
  title: string;
  maxParticipants?: number;
}

export interface CreateTournamentResponse {
  tournament: Tournament;
}

export interface JoinTournamentResponse {
  tournament: Tournament;
  message?: string;
}

export interface LeaveTournamentResponse {
  message: string;
}

export interface ReportMatchResultRequest {
  score1: number;
  score2: number;
}
