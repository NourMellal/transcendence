import type { Friend, UserProfile } from './User';
import type { Match } from './Game';

/**
 * Dashboard profile overview
 * Reuses the richer UserProfile model (stats, friends, match history)
 */
export type DashboardProfile = UserProfile;

/**
 * Recent match summary tailored for the dashboard widget
 */
export interface DashboardMatchSummary {
  id: string;
  opponentId: string;
  opponentUsername: string;
  opponentAvatar?: string;
  result: 'WON' | 'LOST';
  finalScore: string;
  playedAt: string; // ISO date string
  gameType?: string;
  rawMatch?: Match;
}

/**
 * Leaderboard entry for the compact leaderboard widget
 */
export interface DashboardLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  winRate: number; // percentage (0-100) or 0-1 if backend returns ratio
  avatar?: string;
}

/**
 * Combined dashboard payload
 */
export interface DashboardSnapshot {
  profile: DashboardProfile | null;
  friends: Friend[];
  recentMatches: DashboardMatchSummary[];
  leaderboard: DashboardLeaderboardEntry[];
}
