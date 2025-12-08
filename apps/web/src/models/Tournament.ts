import { User } from './User';
import { Match } from './Game';

/**
 * Frontend Tournament model
 */
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  status: 'registration' | 'in_progress' | 'finished' | 'cancelled';
  type: 'single_elimination' | 'double_elimination' | 'round_robin';
  maxParticipants: number;
  currentParticipants: number;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  bracket?: TournamentBracket;
  settings: TournamentSettings;
  prizes?: string[];
  createdBy: string;
  createdAt: string; // ISO date string
  startedAt?: string; // ISO date string
  finishedAt?: string; // ISO date string
  winner?: TournamentParticipant;
}

/**
 * Tournament participant
 */
export interface TournamentParticipant {
  id: string;
  user: User;
  alias: string; // Tournament-specific alias
  seed?: number; // Tournament seeding
  status: 'registered' | 'active' | 'eliminated' | 'winner';
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    totalScore: number;
  };
  registeredAt: string; // ISO date string
}

/**
 * Tournament match (extends regular match)
 */
export interface TournamentMatch extends Match {
  tournamentId: string;
  round: number;
  matchNumber: number;
  nextMatchId?: string; // For elimination tournaments
  isFinalsMatch: boolean;
  scheduledAt?: string; // ISO date string
}

/**
 * Tournament bracket structure
 */
export interface TournamentBracket {
  rounds: BracketRound[];
  totalRounds: number;
  currentRound: number;
}

/**
 * Round in tournament bracket
 */
export interface BracketRound {
  roundNumber: number;
  name: string; // e.g., "Quarter Finals", "Semi Finals", "Finals"
  matches: BracketMatch[];
  isCompleted: boolean;
}

/**
 * Match in tournament bracket
 */
export interface BracketMatch {
  id: string;
  matchNumber: number;
  participant1?: TournamentParticipant;
  participant2?: TournamentParticipant;
  winner?: TournamentParticipant;
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
  scheduledAt?: string;
  nextMatchId?: string;
}

/**
 * Tournament settings
 */
export interface TournamentSettings {
  gameSettings: {
    maxScore: number;
    paddleSpeed: number;
    ballSpeed: number;
    powerUpsEnabled: boolean;
  };
  matchDuration?: number | null; // in minutes, null for unlimited
  breakBetweenMatches: number; // in minutes
  registrationDeadline?: string; // ISO date string
  isPublic: boolean;
  requiresApproval: boolean;
}

/**
 * Tournament leaderboard entry
 */
export interface TournamentLeaderboard {
  rank: number;
  participant: TournamentParticipant;
  points: number;
  matchesWon: number;
  matchesLost: number;
  totalScore: number;
}

/**
 * Request/Response DTOs for tournament-related API calls
 */
export namespace TournamentDTOs {
  export interface CreateTournamentRequest {
    name: string;
    description?: string;
    type: 'single_elimination' | 'double_elimination' | 'round_robin';
    maxParticipants: number;
    settings: TournamentSettings;
    isPublic: boolean;
    registrationDeadline?: string;
  }

  export interface CreateTournamentResponse {
    tournament: Tournament;
  }

  export interface RegisterForTournamentRequest {
    alias: string;
  }

  export interface RegisterForTournamentResponse {
    participant: TournamentParticipant;
  }

  export interface StartTournamentResponse {
    tournament: Tournament;
    firstMatches: TournamentMatch[];
  }

  export interface TournamentListResponse {
    tournaments: Tournament[];
    totalCount: number;
  }

  export interface TournamentLeaderboardResponse {
    leaderboard: TournamentLeaderboard[];
  }
}
