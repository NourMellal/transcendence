import type { Friend, UserProfile } from './User';
import type { Match } from './Game';

/**
 * Dashboard profile view that mirrors the complete UserProfile structure.
 */
export type DashboardProfile = UserProfile;

/**
 * Compact match summary displayed on dashboard widgets.
 */
export interface DashboardMatchSummary {
  id: string;
  opponentId: string;
  opponentUsername: string;
  opponentAvatar?: string;
  result: 'WON' | 'LOST';
  finalScore: string;
  playedAt: string; // ISO 8601 timestamp string
  gameType?: string;
  rawMatch?: Match;
}

/**
 * Leaderboard entry rendered in the compact dashboard widget.
 */
export interface DashboardLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  winRate: number; // Percentage value ranging from 0 to 100
  avatar?: string;
}

/**
 * Aggregated dashboard data consumed by the UI layer.
 */
export interface DashboardSnapshot {
  profile: DashboardProfile | null;
  friends: Friend[];
  recentMatches: DashboardMatchSummary[];
  leaderboard: DashboardLeaderboardEntry[];
}
