import type { MatchStatus, TournamentRole, TournamentStatus, TournamentType } from './Common';

export interface TournamentSummary {
  id: string;
  name: string;
  creatorId: string;
  creatorName?: string;
  status: TournamentStatus;
  currentParticipants: number;
  maxParticipants: number;
  minParticipants: number;
  isPublic: boolean;
  accessCode?: string | null;
  requiresPasscode: boolean;
  readyToStart?: boolean;
  startTimeoutAt?: string | null;
  myRole: TournamentRole;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface TournamentParticipant {
  userId: string;
  username?: string;
  joinedAt: string;
}

export interface TournamentMatchPlayer {
  userId: string;
  username?: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  matchPosition: number;
  player1?: TournamentMatchPlayer | null;
  player2?: TournamentMatchPlayer | null;
  winnerId?: string | null;
  status: MatchStatus;
  gameId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface TournamentDetail extends TournamentSummary {
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  bracketType: TournamentType;
}

export type Tournament = TournamentDetail;

export interface TournamentBracketResponse {
  matches: TournamentMatch[];
}

export namespace TournamentDTOs {
  export interface CreateTournamentRequest {
    name: string;
    bracketType: TournamentType;
    isPublic: boolean;
    privatePasscode?: string | null;
    maxParticipants?: number;
    minParticipants?: number;
  }

  export type CreateTournamentResponse = TournamentDetail;

  export interface JoinTournamentResponse {
    success: boolean;
    message: string;
    status: TournamentStatus;
    participantCount: number;
    readyToStart?: boolean;
    startTimeoutSeconds?: number;
  }

  export interface StartTournamentResponse {
    success: boolean;
    status: 'starting' | 'in_progress';
    startedAt?: string | null;
  }

  export interface PlayMatchResponse {
    gameId: string;
    redirectUrl: string;
  }

  export interface TournamentListResponse {
    tournaments: TournamentSummary[];
  }
}
