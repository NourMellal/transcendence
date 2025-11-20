export interface GameStats {
  activePlayers: number;
  gamesPlayed: number;
  tournaments: number;
  matchmakingTime: number;
  winRate: number;
}

export interface LiveMatchSummary {
  id: string;
  title: string;
  players: Array<{
    username: string;
    score: number;
    avatar?: string;
  }>;
  stage: string;
  league: 'open' | 'elite' | 'legend';
  map: 'neo-noir' | 'lunar-drift' | 'titan-core' | 'classic';
  spectators: number;
  eta: string;
}

export interface TournamentHighlight {
  id: string;
  name: string;
  status: 'registration' | 'live' | 'finals';
  prizePool: number;
  slots: {
    taken: number;
    total: number;
  };
  region: string;
  startDate: string;
}

export interface LandingOverview {
  stats: GameStats;
  liveMatches: LiveMatchSummary[];
  tournaments: TournamentHighlight[];
}



