export interface UpdateProfileRequestDTO {
    readonly displayName?: string;
    readonly avatar?: string;
    readonly email?: string;
    readonly password?: string;
    readonly username?: string;
}

export interface UserProfileDTO {
    readonly id: string;
    readonly email: string;
    readonly username: string;
    readonly displayName?: string;
    readonly avatar?: string;
    readonly is2FAEnabled: boolean;
    readonly oauthProvider?: 'local' | '42';
    readonly status?: 'ONLINE' | 'OFFLINE' | 'INGAME';
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface UpdateProfileResponseDTO {
    readonly id: string;
    readonly email: string;
    readonly username: string;
    readonly displayName?: string;
    readonly avatar?: string;
    readonly is2FAEnabled: boolean;
    readonly oauthProvider?: 'local' | '42';
    readonly updatedAt: string;
    readonly message: string;
}

export interface UpdateProfileInputDTO extends UpdateProfileRequestDTO {
    readonly userId: string;
}
export type LeaderboardType =
  | 'GAMES_WON'
  | 'WIN_RATE'
  | 'TOURNAMENTS_WON'
  | 'TOTAL_SCORE';

export interface UserStatsDTO {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  ranking: number;
  totalScore: number;
}

export interface GetUserInputDTO {
    readonly userId: string;
}

export interface LeaderboardEntryDTO {
  user: UserProfileDTO;
  stats: UserStatsDTO;
}

export interface LeaderboardDTO {
  topPlayers: LeaderboardEntryDTO[];
  lastUpdated: string;
}

export interface GetLeaderboardInput {
  limit?: number;
  type?: LeaderboardType;
}